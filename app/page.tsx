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
  rating?: string;
  regime?: string;

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
      setData(json.data || []);
      setLastTs(json.ts ?? Date.now());
    } catch (e: any) {
      setErr(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const summary = useMemo(() => {
    const total = data.length;

    const stable = data.filter((a) => (a.regime || "").toUpperCase() === "STABLE").length;
    const aRating = data.filter((a) => (a.rating || "").toUpperCase() === "A").length;

    // “Signal global” simple (pas de couleurs, pas de bruit).
    // Tu peux faire évoluer la logique ensuite (RFS), mais là on veut du lisible immédiat.
    const confidence = total ? Math.round((stable / total) * 100) : 0;

    // Top movers (24h) pour la shortlist
    const top = [...data]
      .filter((a) => typeof a.chg_24h_pct === "number")
      .sort((x, y) => (Math.abs(y.chg_24h_pct || 0) - Math.abs(x.chg_24h_pct || 0)))
      .slice(0, 12);

    return { total, stable, aRating, confidence, top };
  }, [data]);

  const shell: React.CSSProperties = {
    maxWidth: 520,
    margin: "0 auto",
    padding: "16px 14px 28px",
    fontFamily:
      'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Segoe UI, Roboto, Helvetica, Arial',
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
    background: "white",
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
  };

  const btn: React.CSSProperties = {
    border: "1px solid rgba(0,0,0,0.12)",
    borderRadius: 12,
    padding: "10px 12px",
    background: "white",
    fontWeight: 700,
  };

  return (
    <main style={shell}>
      {/* Header minimal */}
      <div style={{ ...row, marginBottom: 14 }}>
        <div>
          <div style={h1}>Zilkara</div>
          <p style={sub}>
            {loading ? "Chargement…" : err ? "Erreur" : `OK — ${summary.total} actifs`}
            {lastTs ? ` • ${new Date(lastTs).toLocaleTimeString("fr-FR")}` : ""}
          </p>
        </div>
        <button onClick={load} style={btn} aria-label="Refresh">
          Refresh
        </button>
      </div>

      {/* Erreur */}
      {err ? (
        <div style={{ ...card, marginBottom: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Impossible de charger</div>
          <div style={{ opacity: 0.8, fontSize: 13 }}>{err}</div>
        </div>
      ) : null}

      {/* Signal global dominant */}
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ ...row, marginBottom: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>Signal global</div>
          <div style={pill}>Confiance: {summary.confidence}%</div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={pill}>STABLE: {summary.stable}/{summary.total}</div>
          <div style={pill}>Rating A: {summary.aRating}/{summary.total}</div>
        </div>

        <div style={{ marginTop: 10, opacity: 0.75, fontSize: 12, lineHeight: 1.35 }}>
          Lecture rapide: on privilégie la discipline (stabilité) avant la chasse au mouvement.
        </div>
      </div>

      {/* Shortlist = cards */}
      <div style={{ fontWeight: 900, fontSize: 14, margin: "10px 0" }}>
        Shortlist (mouvements 24h)
      </div>

      {loading ? (
        <div style={{ ...card, opacity: 0.8 }}>Scan en cours…</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {summary.top.map((a, idx) => (
            <a
              key={`${a.symbol || a.name || "x"}-${idx}`}
              href={a.binance_url || "#"}
              style={{ ...card, textDecoration: "none", color: "inherit" }}
            >
              <div style={row}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: 15 }}>
                    {safeStr(a.symbol || a.name)}
                  </div>
                  <div style={{ opacity: 0.75, fontSize: 12 }}>
                    Prix: {fmtPrice(a.price)} • Régime: {safeStr(a.regime)} • Rating: {safeStr(a.rating)}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 900, fontSize: 15 }}>{fmtPct(a.chg_24h_pct)}</div>
                  <div style={{ opacity: 0.75, fontSize: 12 }}>24h</div>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Bas de page minimal */}
      <div style={{ marginTop: 16, opacity: 0.6, fontSize: 12 }}>
        Vue mobile: pas de tableau. 1 signal global + shortlist. Détails uniquement au tap.
      </div>
    </main>
  );
}
