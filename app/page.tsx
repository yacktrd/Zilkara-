"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type ApiError = { code?: string; message?: string };

type ScanAsset = {
  symbol?: string;
  name?: string;
  price?: number;

  chg_24h_pct?: number; // IMPORTANT: référence 24h conservée
  chg_7d_pct?: number;
  chg_30d_pct?: number;

  stability_score?: number;
  regime?: string; // "STABLE" | "TRANSITION" | "VOLATILE" (ou autre)
  rating?: string; // optionnel, mais pas affiché (évaluation non nécessaire)

  // Doit inclure l’affiliation Binance côté API si possible
  // Exemple attendu: https://www.binance.com/en/trade/BTC_USDT?ref=XXXX
  binance_url?: string;

  // champs RFS optionnels
  similarity?: number;
  rupture_rate?: number;
  reason?: string;
};

type ScanResponse = {
  ok: boolean;
  ts?: number;
  data?: ScanAsset[];
  error?: ApiError;
};

function nf(maxFrac: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: maxFrac });
}

function fmtPrice(n?: number) {
  if (n == null || Number.isNaN(n)) return "—";
  // Prix crypto : on garde de la précision sans bruit
  const abs = Math.abs(n);
  if (abs >= 1000) return nf(2).format(n);
  if (abs >= 1) return nf(4).format(n);
  return nf(8).format(n);
}

function fmtPct(n?: number) {
  if (n == null || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${nf(2).format(n)}%`;
}

function fmtInt(n?: number) {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);
}

function safeStr(s?: string) {
  const t = (s || "").trim();
  return t.length ? t : "—";
}

function upper(s?: string) {
  return (s || "").trim().toUpperCase();
}

/**
 * Auto-refresh invisible:
 * - on refresh toutes les 60s
 * - on ne bloque pas l'écran (pas de "loading" agressif)
 * - on affiche seulement "Mis à jour : HH:MM:SS" discret
 */
const REFRESH_MS = 60_000;

export default function Page() {
  const [items, setItems] = useState<ScanAsset[]>([]);
  const [loading, setLoading] = useState(true); // seulement au 1er chargement
  const [softRefreshing, setSoftRefreshing] = useState(false); // refresh invisible
  const [err, setErr] = useState<string | null>(null);
  const [lastTs, setLastTs] = useState<number | null>(null);

  const timerRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function fetchScan(isSoft = false) {
    // annule requête précédente si besoin (stabilité)
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    if (isSoft) setSoftRefreshing(true);
    else setLoading(true);

    setErr(null);

    try {
      const r = await fetch("/api/scan", {
        cache: "no-store",
        signal: ac.signal,
        headers: { "accept": "application/json" },
      });

      // si non-200, on tente de lire l’erreur mais sans casser
      const j = (await r.json().catch(() => null)) as ScanResponse | null;

      if (!r.ok || !j?.ok) {
        const msg =
          j?.error?.message ||
          (r.status ? `HTTP ${r.status}` : "Erreur de chargement");
        throw new Error(msg);
      }

      const list = Array.isArray(j.data) ? j.data : [];
      setItems(list);
      setLastTs(typeof j.ts === "number" ? j.ts : Date.now());
    } catch (e: any) {
      if (e?.name === "AbortError") return; // normal
      setErr(e?.message || "Erreur");
    } finally {
      if (isSoft) setSoftRefreshing(false);
      else setLoading(false);
    }
  }

  useEffect(() => {
    void fetchScan(false);

    // interval refresh invisible
    timerRef.current = window.setInterval(() => {
      void fetchScan(true);
    }, REFRESH_MS);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Tri trading-grade:
   * - priorité au stability_score (desc)
   * - puis chg_24h_pct (abs desc) pour départager
   */
  const sorted = useMemo(() => {
    const copy = [...items];
    copy.sort((a, b) => {
      const sa = a.stability_score ?? -1;
      const sb = b.stability_score ?? -1;
      if (sb !== sa) return sb - sa;

      const aa = typeof a.chg_24h_pct === "number" ? Math.abs(a.chg_24h_pct) : -1;
      const ab = typeof b.chg_24h_pct === "number" ? Math.abs(b.chg_24h_pct) : -1;
      return ab - aa;
    });
    return copy;
  }, [items]);

  /**
   * Signal global (compatible RFS sans entrer dans des détails internes):
   * - ratio STABLE
   * - indice contextuel simple (0..100) basé sur STABLE/total
   * => outil de filtrage / régulation contextuelle (pas un “scanner hype”)
   */
  const context = useMemo(() => {
    const total = sorted.length;
    const stableCount = sorted.reduce(
      (acc, x) => acc + (upper(x.regime) === "STABLE" ? 1 : 0),
      0
    );

    // indice contextuel (simple, robuste, lisible)
    const index = total > 0 ? Math.round((stableCount / total) * 100) : 0;

    return { total, stableCount, index };
  }, [sorted]);

  /**
   * Shortlist (référence 24h conservée):
   * - top mouvements 24h en valeur absolue
   * - limité pour lecture rapide (discipline + vitesse)
   */
  const shortlist = useMemo(() => {
    const list = sorted
      .filter((a) => typeof a.chg_24h_pct === "number" && !Number.isNaN(a.chg_24h_pct))
      .sort((a, b) => Math.abs((b.chg_24h_pct as number)) - Math.abs((a.chg_24h_pct as number)))
      .slice(0, 10);
    return list;
  }, [sorted]);

  const lastUpdatedText = useMemo(() => {
    if (!lastTs) return "—";
    const d = new Date(lastTs);
    const pad = (x: number) => String(x).padStart(2, "0");
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }, [lastTs]);

  // --- Styles (Apple-like: sobre, aligné, respirant)
  const shell: React.CSSProperties = {
    maxWidth: 820,
    margin: "0 auto",
    padding: "16px 14px 26px",
    fontFamily:
      'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Segoe UI, Roboto, Helvetica, Arial',
    color: "#0B0B0C",
  };

  const topRow: React.CSSProperties = {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
  };

  const h1: React.CSSProperties = {
    fontSize: 28,
    fontWeight: 900,
    letterSpacing: -0.8,
    margin: 0,
    lineHeight: 1.1,
  };

  const sub: React.CSSProperties = {
    margin: "6px 0 0",
    fontSize: 12,
    opacity: 0.7,
    lineHeight: 1.3,
  };

  const pill: React.CSSProperties = {
    border: "1px solid rgba(0,0,0,0.10)",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    background: "#FFF",
    whiteSpace: "nowrap",
  };

  const card: React.CSSProperties = {
    border: "1px solid rgba(0,0,0,0.10)",
    borderRadius: 14,
    padding: 14,
    background: "#FFF",
  };

  const sectionTitle: React.CSSProperties = {
    margin: "16px 0 8px",
    fontSize: 13,
    fontWeight: 900,
    letterSpacing: -0.2,
  };

  const subtle: React.CSSProperties = {
    fontSize: 12,
    opacity: 0.75,
  };

  const btn: React.CSSProperties = {
    border: "1px solid rgba(0,0,0,0.12)",
    borderRadius: 12,
    padding: "10px 12px",
    background: "#FFF",
    fontWeight: 800,
    cursor: "pointer",
  };

  const tableWrap: React.CSSProperties = {
    border: "1px solid rgba(0,0,0,0.10)",
    borderRadius: 14,
    overflow: "hidden",
    background: "#FFF",
  };

  const th: React.CSSProperties = {
    padding: "12px 12px",
    fontSize: 12,
    opacity: 0.75,
    fontWeight: 900,
    textAlign: "left",
    whiteSpace: "nowrap",
    background: "rgba(0,0,0,0.03)",
  };

  const td: React.CSSProperties = {
    padding: "12px 12px",
    fontSize: 13,
    verticalAlign: "top",
    whiteSpace: "nowrap",
    borderTop: "1px solid rgba(0,0,0,0.06)",
  };

  const right: React.CSSProperties = { textAlign: "right" };

  function pctColor(n?: number) {
    if (n == null || Number.isNaN(n)) return "#0B0B0C";
    if (n > 0) return "#0A7A4A";
    if (n < 0) return "#C43D3D";
    return "#0B0B0C";
  }

  function regimeDot(reg?: string) {
    const r = upper(reg);
    // Dot minimal (signal perceptif, pas décoratif)
    if (r === "STABLE") return "#0A7A4A";
    if (r === "TRANSITION") return "#B58B00";
    if (r === "VOLATILE") return "#C43D3D";
    return "rgba(0,0,0,0.35)";
  }

  const statusLine = useMemo(() => {
    if (loading) return "Chargement…";
    if (err) return "Erreur";
    return `OK — ${context.total} actifs`;
  }, [loading, err, context.total]);

  return (
    <main style={shell}>
      {/* Header: ultra clair */}
      <div style={topRow}>
        <div>
          <h1 style={h1}>Zilkara</h1>
          <p style={sub}>
            {statusLine} · Mis à jour: {lastUpdatedText}
            {softRefreshing ? " · sync" : ""}
          </p>
        </div>

        {/* Action unique (manipulation directe) */}
        <button
          style={btn}
          onClick={() => void fetchScan(true)}
          disabled={loading}
          aria-label="Refresh"
          title="Refresh"
        >
          Refresh
        </button>
      </div>

      {/* Error: clair, actionnable */}
      {err ? (
        <div style={{ ...card, marginTop: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Chargement impossible</div>
          <div style={{ ...subtle, marginBottom: 10 }}>{err}</div>
          <button style={btn} onClick={() => void fetchScan(false)}>
            Réessayer
          </button>
        </div>
      ) : null}

      {/* Signal global (RFS-compatible, sans surcharger) */}
      <div style={{ ...card, marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontWeight: 900, fontSize: 13 }}>Indice contextuel</div>
          <div style={pill}>{context.index}%</div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
          <div style={pill}>
            STABLE: {context.stableCount}/{context.total}
          </div>
          <div style={pill}>Référence: 24h</div>
        </div>

        <div style={{ marginTop: 10, ...subtle }}>
          Objectif: filtrer le contexte et réguler le risque. Lecture rapide, discipline d’abord.
        </div>
      </div>

      {/* Shortlist 24h (attente public + trading) */}
      <div style={sectionTitle}>Mouvements 24h</div>

      {loading ? (
        <div style={{ ...card, opacity: 0.75 }}>Scan en cours…</div>
      ) : shortlist.length === 0 ? (
        <div style={{ ...card, opacity: 0.75 }}>Aucun mouvement 24h significatif.</div>
      ) : (
        <div style={tableWrap}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 740 }}>
              <thead>
                <tr>
                  <th style={th}>Asset</th>
                  <th style={{ ...th, ...right }}>Price</th>
                  <th style={{ ...th, ...right }}>24h</th>
                  <th style={{ ...th, ...right }}>Score</th>
                  <th style={th}>Régime</th>
                  <th style={th}>Binance</th>
                </tr>
              </thead>
              <tbody>
                {shortlist.map((a, i) => {
                  const sym = safeStr(a.symbol);
                  const name = safeStr(a.name);
                  const pct = a.chg_24h_pct;

                  return (
                    <tr key={`${sym}-${i}`}>
                      <td style={td}>
                        <div style={{ fontWeight: 900 }}>{sym}</div>
                        <div style={{ fontSize: 12, opacity: 0.7 }}>{name}</div>
                      </td>

                      <td style={{ ...td, ...right }}>{fmtPrice(a.price)}</td>

                      <td style={{ ...td, ...right, color: pctColor(pct), fontWeight: 900 }}>
                        {fmtPct(pct)}
                      </td>

                      <td style={{ ...td, ...right, fontWeight: 900 }}>
                        {fmtInt(a.stability_score)}
                      </td>

                      <td style={td}>
                        <span
                          aria-hidden="true"
                          style={{
                            display: "inline-block",
                            width: 8,
                            height: 8,
                            borderRadius: 999,
                            background: regimeDot(a.regime),
                            marginRight: 8,
                            verticalAlign: "middle",
                          }}
                        />
                        <span style={{ fontWeight: 800, fontSize: 12 }}>{safeStr(a.regime)}</span>
                      </td>

                      <td style={td}>
                        {a.binance_url ? (
                          <a
                            href={a.binance_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: "inline-block",
                              padding: "8px 10px",
                              borderRadius: 12,
                              border: "1px solid rgba(0,0,0,0.10)",
                              textDecoration: "none",
                              color: "#0B0B0C",
                              fontWeight: 900,
                              fontSize: 12,
                              background: "#FFF",
                            }}
                            aria-label={`Ouvrir ${sym} sur Binance`}
                            title="Ouvrir sur Binance"
                          >
                            Ouvrir
                          </a>
                        ) : (
                          <span style={{ opacity: 0.6 }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Discret, pas de bruit */}
      <div style={{ marginTop: 10, ...subtle }}>
        Actualisation automatique toutes les 60s. (Invisible — pour éviter l’impression de bug, l’horodatage suffit.)
      </div>
    </main>
  );
}
