"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * HOME V2 (OFFICIELLE)
 * - Aucun filtre côté UI.
 * - La source unique est /api/scan.
 * - Le tri est verrouillé côté API (confidence_score desc).
 * - L’UI affiche exactement ce que l’API renvoie.
 */

type ScanAsset = {
  symbol: string;
  name: string;
  price: number;
  chg_24h_pct: number;
  confidence_score: number;
  regime: string;
  binance_url: string;
  affiliate_url: string;
};

type ScanResponse = {
  ok: boolean;
  count?: number;
  items?: ScanAsset[];
  meta?: {
    sorted_by?: string;
    generated_at?: string;
  };
  error?: string;
  detail?: string;
};

function fmtPct(n: number | null | undefined) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  const sign = Number(n) > 0 ? "+" : "";
  return `${sign}${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(Number(n))}%`;
}

function fmtPrice(n: number | null | undefined) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 8 }).format(Number(n));
}

function safeStr(s: string | null | undefined) {
  const v = (s ?? "").toString().trim();
  return v.length ? v : "—";
}

function regimeDot(regime: string) {
  const r = (regime || "").toUpperCase();
  if (r === "STABLE") return "#1F8A4C";
  if (r === "TRANSITION") return "#B7791F";
  if (r === "VOLATILE") return "#C53030";
  return "rgba(0,0,0,0.35)";
}

async function fetchScan(signal?: AbortSignal): Promise<ScanResponse> {
  const res = await fetch("/api/scan", { cache: "no-store", signal });
  const json = (await res.json().catch(() => null)) as ScanResponse | null;

  if (!res.ok) {
    return {
      ok: false,
      error: "HTTP_ERROR",
      detail: (json as any)?.detail ?? `HTTP_${res.status}`,
    };
  }
  if (!json) {
    return { ok: false, error: "BAD_JSON", detail: "Invalid JSON response" };
  }
  return json;
}

export default function Page() {
  const [items, setItems] = useState<ScanAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [lastUpdated, setLastUpdated] = useState<string>("—");
  const [count, setCount] = useState<number>(0);

  const timerRef = useRef<number | null>(null);
  const inflightRef = useRef(false);

  const header = useMemo(() => {
    return {
      title: "Zilkara",
      subtitle: `OK — ${count} actifs · Mis à jour : ${lastUpdated}`,
    };
  }, [count, lastUpdated]);

  async function load(isInitial = false) {
    if (inflightRef.current) return;
    inflightRef.current = true;

    if (isInitial) setLoading(true);
    else setSyncing(true);

    setErr(null);

    const ctrl = new AbortController();

    try {
      const json = await fetchScan(ctrl.signal);

      if (!json.ok) {
        setItems([]);
        setCount(0);
        setLastUpdated(new Date().toLocaleTimeString("fr-FR"));
        setErr(json.detail || json.error || "SCAN_FAILED");
        return;
      }

      const next = json.items ?? [];

      // ⚠️ AUCUN FILTRE ICI
      // Le backend gère tri/selection.
      setItems(next);
      setCount(typeof json.count === "number" ? json.count : next.length);

      const ts = json.meta?.generated_at
        ? new Date(json.meta.generated_at).toLocaleTimeString("fr-FR")
        : new Date().toLocaleTimeString("fr-FR");
      setLastUpdated(ts);
    } catch (e: any) {
      setItems([]);
      setCount(0);
      setLastUpdated(new Date().toLocaleTimeString("fr-FR"));
      setErr(e?.message ?? "FETCH_FAILED");
    } finally {
      inflightRef.current = false;
      setLoading(false);
      setSyncing(false);
    }
  }

  useEffect(() => {
    // initial load
    load(true);

    // auto refresh léger (toutes les 60s)
    timerRef.current = window.setInterval(() => {
      load(false);
    }, 60_000);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>{header.title}</h1>
          <div style={{ opacity: 0.7, marginTop: 4 }}>{header.subtitle}</div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={() => load(false)}
            disabled={loading || syncing}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "white",
              cursor: loading || syncing ? "not-allowed" : "pointer",
            }}
            title="Rafraîchir"
          >
            {syncing ? "Sync…" : "Refresh"}
          </button>
        </div>
      </header>

      <section style={{ marginTop: 16 }}>
        <div
          style={{
            padding: 14,
            borderRadius: 14,
            border: "1px solid rgba(0,0,0,0.08)",
            background: "rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Indice contextuel</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid rgba(0,0,0,0.10)",
                background: "white",
                fontSize: 13,
              }}
            >
              Référence: 24h
            </span>
            <span
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid rgba(0,0,0,0.10)",
                background: "white",
                fontSize: 13,
              }}
            >
              Tri: score (desc)
            </span>
            <span style={{ opacity: 0.7, fontSize: 13 }}>
              RFS: Filtrage & régulation du risque. Lecture rapide, discipline d’abord.
            </span>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Mouvements 24h</h2>
          {err ? (
            <span style={{ color: "#C53030", fontSize: 13 }}>Erreur: {err}</span>
          ) : (
            <span style={{ opacity: 0.6, fontSize: 13 }}>{loading ? "Chargement…" : "—"}</span>
          )}
        </div>

        <div style={{ marginTop: 10, borderRadius: 14, border: "1px solid rgba(0,0,0,0.08)", overflow: "hidden" }}>
          <div style={{ width: "100%", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.03)" }}>
                  <th style={thStyle}>Actif</th>
                  <th style={thStyle}>Prix</th>
                  <th style={thStyle}>24h</th>
                  <th style={thStyle}>Score</th>
                  <th style={thStyle}>Régime</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Binance</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td style={tdStyle} colSpan={6}>
                      Chargement…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td style={tdStyle} colSpan={6}>
                      Aucun résultat.
                    </td>
                  </tr>
                ) : (
                  items.map((row) => {
                    const openUrl = row.affiliate_url || row.binance_url;
                    return (
                      <tr key={row.symbol} style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                        <td style={tdStyle}>
                          <div style={{ fontWeight: 600 }}>{safeStr(row.symbol)}</div>
                          <div style={{ opacity: 0.7, fontSize: 13 }}>{safeStr(row.name)}</div>
                        </td>
                        <td style={tdStyle}>{fmtPrice(row.price)}</td>
                        <td style={tdStyle}>{fmtPct(row.chg_24h_pct)}</td>
                        <td style={tdStyle}>{safeStr(String(row.confidence_score))}</td>
                        <td style={tdStyle}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                            <span
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: 999,
                                background: regimeDot(row.regime),
                                display: "inline-block",
                              }}
                            />
                            {safeStr(row.regime)}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>
                          <a
                            href={openUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: "inline-block",
                              padding: "6px 10px",
                              borderRadius: 10,
                              border: "1px solid rgba(0,0,0,0.12)",
                              textDecoration: "none",
                              color: "inherit",
                              background: "white",
                            }}
                          >
                            Ouvrir
                          </a>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: 13,
  opacity: 0.75,
  fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  padding: "12px",
  verticalAlign: "top",
  fontSize: 14,
};
