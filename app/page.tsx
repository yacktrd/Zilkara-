"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Standard API attendu (backend) :
 * { symbol, price, chg_24h_pct, stability_score, regime, binance_url }
 * Tolérance front : { asset } possible sur anciennes réponses.
 */
type ScanAsset = {
  symbol?: string;
  asset?: string; // fallback tolérant
  price?: number;
  chg_24h_pct?: number;
  stability_score?: number;
  regime?: string; // STABLE | TRANSITION | VOLATILE
  binance_url?: string;
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

function normalizeSymbol(a: ScanAsset): string {
  const raw = (a.symbol ?? a.asset ?? "").toString().trim();
  return raw.length ? raw : "—";
}

function regimeDotColor(regime?: string) {
  const r = String(regime || "").toUpperCase();
  if (r === "STABLE") return "#1F8A4C";
  if (r === "TRANSITION") return "#B7791F";
  if (r === "VOLATILE") return "#C53030";
  return "rgba(0,0,0,0.35)";
}

export default function Page() {
  const [data, setData] = useState<ScanAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false); // auto-refresh invisible (indicateur discret)
  const [err, setErr] = useState<string | null>(null);
  const [lastTs, setLastTs] = useState<number | null>(null);

  const timerRef = useRef<number | null>(null);
  const inflightRef = useRef(false);

  async function load(opts?: { silent?: boolean; forceApplyEmpty?: boolean }) {
    const silent = !!opts?.silent;
    const forceApplyEmpty = !!opts?.forceApplyEmpty;

    if (inflightRef.current) return;
    inflightRef.current = true;

    if (!silent) setLoading(true);
    else setSyncing(true);

    // En mode silencieux, on évite de clignoter l’erreur à l’écran
    if (!silent) setErr(null);

    try {
      const res = await fetch("/api/scan", { cache: "no-store" });
      const json = (await res.json()) as ScanResponse;

      if (!json?.ok) {
        throw new Error(json?.error?.message || "Scan failed");
      }

      const arr = Array.isArray(json.data) ? json.data : [];
      const ts = typeof json.ts === "number" ? json.ts : Date.now();

      // Règle anti-“liste vide accidentelle” :
      // - si arr est vide et qu’on est en silent => on conserve l’état actuel
      // - si refresh manuel => on accepte vide uniquement si forceApplyEmpty
      if (arr.length > 0 || forceApplyEmpty) {
        setData(arr);
      }

      setLastTs(ts);
      if (!silent) setErr(null);
    } catch (e: any) {
      // Silent refresh : on ne flingue pas l’UX, on garde l’état existant
      if (!silent) setErr(e?.message || "Error");
    } finally {
      if (!silent) setLoading(false);
      setSyncing(false);
      inflightRef.current = false;
    }
  }

  useEffect(() => {
    void load({ silent: false, forceApplyEmpty: true });

    // Auto-refresh invisible : 30s (tu peux passer à 20s si tu veux)
    timerRef.current = window.setInterval(() => {
      void load({ silent: true, forceApplyEmpty: false });
    }, 30_000);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = useMemo(() => {
    const total = data.length;
    const stable = data.reduce(
      (acc, a) => acc + (String(a.regime || "").toUpperCase() === "STABLE" ? 1 : 0),
      0
    );
    const confidence = total > 0 ? Math.round((stable / total) * 100) : 0;

    // Table 24h : on garde une logique “trading-grade” : gros mouvements en haut
    const rows = [...data]
      .filter((a) => typeof a.chg_24h_pct === "number" && !Number.isNaN(a.chg_24h_pct))
      .sort((a, b) => Math.abs((b.chg_24h_pct as number) ?? 0) - Math.abs((a.chg_24h_pct as number) ?? 0));

    return { total, stable, confidence, rows };
  }, [data]);

  // Styles minimalistes “Apple-like” + lisibles mobile
  const shell: React.CSSProperties = {
    maxWidth: 980,
    margin: "0 auto",
    padding: "16px 14px 28px",
    fontFamily:
      'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Segoe UI, Roboto, Helvetica, Arial',
    color: "#111",
    background: "#fff",
  };

  const row: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  };

  const h1: React.CSSProperties = {
    fontSize: 28,
    letterSpacing: -0.6,
    margin: "4px 0 2px",
    fontWeight: 900,
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
    fontWeight: 800,
    cursor: "pointer",
  };

  const sectionTitle: React.CSSProperties = {
    margin: "16px 0 8px",
    fontSize: 14,
    fontWeight: 900,
    letterSpacing: -0.2,
  };

  const note: React.CSSProperties = {
    marginTop: 8,
    opacity: 0.78,
    fontSize: 12,
    lineHeight: 1.35,
  };

  const tableWrap: React.CSSProperties = {
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: 14,
    overflow: "hidden",
    background: "#fff",
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
    letterSpacing: -0.1,
    padding: "10px 12px",
    background: "rgba(0,0,0,0.03)",
    borderBottom: "1px solid rgba(0,0,0,0.08)",
    whiteSpace: "nowrap",
  };

  const td: React.CSSProperties = {
    padding: "10px 12px",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
  };

  const tdMuted: React.CSSProperties = { ...td, opacity: 0.85 };

  const right: React.CSSProperties = { textAlign: "right" };

  const smallStatusDot: React.CSSProperties = {
    width: 8,
    height: 8,
    borderRadius: 999,
    display: "inline-block",
    background: syncing ? "#111" : "rgba(0,0,0,0.25)",
    marginRight: 8,
    transform: syncing ? "scale(1.05)" : "scale(1)",
    transition: "transform 140ms ease",
  };

  const binanceLinkStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.10)",
    textDecoration: "none",
    fontWeight: 800,
    fontSize: 12,
    color: "#111",
    background: "#fff",
  };

  const pctColor = (pct?: number) => {
    if (typeof pct !== "number" || Number.isNaN(pct)) return "#111";
    if (pct > 0) return "#0A7";
    if (pct < 0) return "#C33";
    return "#111";
  };

  const headerStatus = loading ? "Chargement…" : err ? "Erreur" : "OK";
  const lastTime = lastTs ? nowHHMMSS(new Date(lastTs)) : "";

  return (
    <main style={shell}>
      {/* Header */}
      <div style={{ ...row, marginBottom: 14 }}>
        <div style={{ minWidth: 0 }}>
          <div style={h1}>Zilkara</div>
          <p style={sub}>
            {headerStatus} — {summary.total} actifs{lastTime ? ` · Mis à jour : ${lastTime}` : ""}
          </p>
        </div>

        <button
          style={btn}
          onClick={() => void load({ silent: false, forceApplyEmpty: true })}
          aria-label="Refresh"
          title="Refresh"
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {/* Erreur (visible seulement si refresh manuel / premier load) */}
      {err ? (
        <div style={{ ...card, marginBottom: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Impossible de charger</div>
          <div style={{ opacity: 0.85, fontSize: 13 }}>{err}</div>
        </div>
      ) : null}

      {/* Indice contextuel */}
      <div style={card}>
        <div style={{ ...row, marginBottom: 10 }}>
          <div style={{ fontWeight: 900, fontSize: 14 }}>Indice contextuel</div>

          <div style={pill}>
            <span style={smallStatusDot} />
            Confiance: {summary.confidence}%
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={pill}>
            STABLE: {summary.stable}/{summary.total}
          </div>
          <div style={pill}>Référence: 24h</div>
          <div style={pill}>RFS: Filtrage &amp; régulation du risque</div>
        </div>

        <div style={note}>
          Objectif: filtrer le contexte et réguler le risque. Lecture rapide, discipline d’abord.
        </div>
      </div>

      {/* Mouvements 24h */}
      <div style={sectionTitle}>Mouvements 24h</div>

      {loading ? (
        <div style={{ ...card, opacity: 0.75 }}>Scan en cours…</div>
      ) : summary.rows.length === 0 ? (
        <div style={{ ...card, opacity: 0.75 }}>Aucun résultat compatible.</div>
      ) : (
        <div style={tableWrap}>
          <div style={{ overflowX: "auto" }}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Asset</th>
                  <th style={th}>Price</th>
                  <th style={{ ...th, ...right }}>24h</th>
                  <th style={{ ...th, ...right }}>Score</th>
                  <th style={th}>Régime</th>
                  <th style={{ ...th, ...right }}>Binance</th>
                </tr>
              </thead>
              <tbody>
                {summary.rows.slice(0, 50).map((a, idx) => {
                  const sym = normalizeSymbol(a);
                  const pct = a.chg_24h_pct;
                  const r = safeStr(a.regime);
                  const dot = regimeDotColor(a.regime);

                  return (
                    <tr key={`${sym}-${idx}`}>
                      <td style={{ ...td, fontWeight: 900 }}>{sym}</td>
                      <td style={tdMuted}>{fmtPrice(a.price)}</td>
                      <td style={{ ...td, ...right, fontWeight: 900, color: pctColor(pct) }}>
                        {fmtPct(pct)}
                      </td>
                      <td style={{ ...td, ...right, fontWeight: 800 }}>
                        {typeof a.stability_score === "number" && !Number.isNaN(a.stability_score)
                          ? a.stability_score
                          : "—"}
                      </td>
                      <td style={td}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            fontWeight: 800,
                          }}
                        >
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 999,
                              background: dot,
                              display: "inline-block",
                            }}
                          />
                          {r}
                        </span>
                      </td>
                      <td style={{ ...td, ...right }}>
                        {a.binance_url ? (
                          <a
                            href={a.binance_url}
                            target="_blank"
                            rel="noreferrer"
                            style={binanceLinkStyle}
                            aria-label={`Ouvrir ${sym} sur Binance`}
                            title="Ouvrir"
                          >
                            Ouvrir
                          </a>
                        ) : (
                          <span style={{ opacity: 0.5 }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ padding: "10px 12px", fontSize: 12, opacity: 0.7 }}>
            Liens Binance: affiliation sobre, non intrusive.
          </div>
        </div>
      )}
    </main>
  );
}
