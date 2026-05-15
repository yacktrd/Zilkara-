"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

type SummaryAsset = {
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

type SummaryState = Record<string, unknown> | null;

type SummaryCache = {
  status: "hit" | "miss" | "stale";
  layer: "kv" | "memory" | "none";
  ttl_ms: number;
};

type SummaryResponse = {
  ok: boolean;
  ts: string;
  version: string;
  state: SummaryState;
  opportunities: SummaryAsset[];
  scan_meta: {
    source?: string;
    quote?: string;
    assets: number;
  };
  error: string | null;
  degraded?: boolean;
  warnings?: string[];
  cache?: SummaryCache;
};

function safeString(value: unknown, fallback = "—"): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function safeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function fmtPct(value: unknown): string {
  const n = safeNumber(value);
  if (n === null) return "—";

  const sign = n > 0 ? "+" : "";
  return `${sign}${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
  }).format(n)}%`;
}

function fmtPrice(value: unknown): string {
  const n = safeNumber(value);
  if (n === null) return "—";

  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 8,
  }).format(n);
}

function nowHHMMSS(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds()
  )}`;
}

function formatTimestamp(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleString("fr-FR");
}

function normalizeAssets(value: unknown): SummaryAsset[] {
  return Array.isArray(value) ? (value as SummaryAsset[]) : [];
}

function normalizeWarnings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function getStateLabel(state: SummaryState): string {
  if (!state || typeof state !== "object") return "—";

  const record = state as Record<string, unknown>;

  const candidates = [
    record.regime,
    record.market_regime,
    record.label,
    record.state,
    record.phase,
    record.name,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return "—";
}

function getStateConfidence(state: SummaryState): string {
  if (!state || typeof state !== "object") return "—";

  const record = state as Record<string, unknown>;

  const candidates = [
    record.confidence,
    record.score,
    record.stability_score,
    record.probability,
  ];

  for (const candidate of candidates) {
    const n = safeNumber(candidate);
    if (n !== null) return String(n);
  }

  return "—";
}

export default function SummaryPage() {
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string>("—");

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);

    try {
      const res = await fetch("/api/summary", {
        method: "GET",
        cache: "no-store",
      });

      let json: unknown = null;

      try {
        json = await res.json();
      } catch {
        throw new Error("Réponse JSON invalide");
      }

      if (!res.ok) {
        const apiError =
          json &&
          typeof json === "object" &&
          "error" in json &&
          typeof (json as { error?: unknown }).error === "string"
            ? (json as { error: string }).error
            : `HTTP ${res.status}`;

        throw new Error(apiError);
      }

      const payload = json as SummaryResponse;

      setData(payload);
      setLastRefresh(nowHHMMSS());
    } catch (error: unknown) {
      setErr(error instanceof Error ? error.message : "Erreur inconnue");
      setData(null);
      setLastRefresh(nowHHMMSS());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => {
    const assets = normalizeAssets(data?.opportunities);
    const total = assets.length;

    const stable = assets.reduce((acc, asset) => {
      return acc + (safeString(asset.regime, "").toUpperCase() === "STABLE" ? 1 : 0);
    }, 0);

    const ratingA = assets.reduce((acc, asset) => {
      return acc + (safeString(asset.rating, "").toUpperCase() === "A" ? 1 : 0);
    }, 0);

    const confidence = total > 0 ? Math.round((stable / total) * 100) : 0;

    const shortlist = [...assets]
      .filter((asset) => {
        const n = safeNumber(asset.chg_24h_pct);
        return n !== null;
      })
      .sort((a, b) => {
        const av = Math.abs(safeNumber(a.chg_24h_pct) ?? 0);
        const bv = Math.abs(safeNumber(b.chg_24h_pct) ?? 0);
        return bv - av;
      })
      .slice(0, 8);

    return {
      total,
      stable,
      ratingA,
      confidence,
      shortlist,
    };
  }, [data]);

  const warnings = normalizeWarnings(data?.warnings);

  const shellStyle: React.CSSProperties = {
    maxWidth: 760,
    margin: "0 auto",
    padding: "20px 16px 40px",
    fontFamily:
      'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    color: "#111",
  };

  const h1Style: React.CSSProperties = {
    fontSize: 28,
    lineHeight: 1.05,
    letterSpacing: -0.6,
    margin: "0 0 6px",
    fontWeight: 800,
  };

  const subStyle: React.CSSProperties = {
    opacity: 0.76,
    fontSize: 13,
    margin: 0,
    lineHeight: 1.4,
  };

  const cardStyle: React.CSSProperties = {
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: 16,
    padding: 14,
    background: "#fff",
  };

  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  };

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    marginTop: 14,
  };

  const pillStyle: React.CSSProperties = {
    border: "1px solid rgba(0,0,0,0.10)",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    whiteSpace: "nowrap",
    background: "#fff",
  };

  const buttonStyle: React.CSSProperties = {
    border: "1px solid rgba(0,0,0,0.12)",
    borderRadius: 12,
    padding: "10px 12px",
    background: "#fff",
    fontWeight: 700,
    cursor: loading ? "default" : "pointer",
  };

  const sectionTitleStyle: React.CSSProperties = {
    margin: "16px 0 8px",
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: -0.2,
  };

  const smallNoteStyle: React.CSSProperties = {
    marginTop: 8,
    opacity: 0.78,
    fontSize: 12,
    lineHeight: 1.35,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    opacity: 0.72,
    fontWeight: 700,
    marginBottom: 4,
  };

  const bigStyle: React.CSSProperties = {
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: -0.4,
  };

  const rightStyle: React.CSSProperties = {
    textAlign: "right",
  };

  return (
    <main style={shellStyle}>
      <div style={{ ...rowStyle, marginBottom: 14 }}>
        <div>
          <h1 style={h1Style}>Xyvala Summary</h1>
          <p style={subStyle}>
            {loading
              ? "Chargement…"
              : err
              ? `Erreur : ${err}`
              : `${summary.total} actif(s) • dernière mise à jour ${lastRefresh}`}
          </p>
        </div>

        <button
          type="button"
          style={buttonStyle}
          onClick={() => {
            if (!loading) void load();
          }}
          aria-label="Rafraîchir"
          title="Rafraîchir"
          disabled={loading}
        >
          {loading ? "Chargement..." : "Refresh"}
        </button>
      </div>

      <section style={cardStyle}>
        <div style={gridStyle}>
          <div>
            <div style={labelStyle}>Total opportunités</div>
            <div style={bigStyle}>{summary.total}</div>
          </div>

          <div>
            <div style={labelStyle}>Régime stable</div>
            <div style={bigStyle}>{summary.stable}</div>
          </div>

          <div>
            <div style={labelStyle}>Rating A</div>
            <div style={bigStyle}>{summary.ratingA}</div>
          </div>

          <div style={rightStyle}>
            <div style={labelStyle}>Confiance interne</div>
            <div style={bigStyle}>{summary.confidence}%</div>
          </div>
        </div>

        <div style={smallNoteStyle}>
          Source : {safeString(data?.scan_meta?.source)} • Quote :{" "}
          {safeString(data?.scan_meta?.quote)} • Cache :{" "}
          {safeString(data?.cache?.status)} / {safeString(data?.cache?.layer)}
        </div>
      </section>

      <section style={{ ...cardStyle, marginTop: 14 }}>
        <div style={sectionTitleStyle}>État global</div>

        <div style={gridStyle}>
          <div>
            <div style={labelStyle}>État</div>
            <div style={{ fontWeight: 700 }}>{getStateLabel(data?.state ?? null)}</div>
          </div>

          <div>
            <div style={labelStyle}>Confiance</div>
            <div style={{ fontWeight: 700 }}>
              {getStateConfidence(data?.state ?? null)}
            </div>
          </div>

          <div>
            <div style={labelStyle}>Version</div>
            <div style={{ fontWeight: 700 }}>{safeString(data?.version)}</div>
          </div>

          <div>
            <div style={labelStyle}>Timestamp API</div>
            <div style={{ fontWeight: 700 }}>{formatTimestamp(data?.ts)}</div>
          </div>
        </div>

        {data?.degraded ? (
          <div style={{ ...smallNoteStyle, color: "#8a5a00" }}>
            Réponse dégradée détectée.
          </div>
        ) : null}
      </section>

      <section style={{ ...cardStyle, marginTop: 14 }}>
        <div style={sectionTitleStyle}>Warnings</div>

        {warnings.length === 0 ? (
          <div style={{ opacity: 0.72 }}>Aucun warning.</div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {warnings.map((warning) => (
              <span key={warning} style={pillStyle}>
                {warning}
              </span>
            ))}
          </div>
        )}
      </section>

      <section style={{ ...cardStyle, marginTop: 14 }}>
        <div style={sectionTitleStyle}>Shortlist 24h</div>

        {summary.shortlist.length === 0 ? (
          <div style={{ opacity: 0.72 }}>Aucune donnée disponible.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {summary.shortlist.map((asset, index) => (
              <div
                key={`${safeString(asset.symbol, "asset")}-${index}`}
                style={{
                  border: "1px solid rgba(0,0,0,0.06)",
                  borderRadius: 12,
                  padding: 12,
                  background: "#fff",
                }}
              >
                <div style={{ ...rowStyle, alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>
                      {safeString(asset.symbol)}{" "}
                      <span style={{ opacity: 0.55, fontWeight: 600 }}>
                        {safeString(asset.name, "")}
                      </span>
                    </div>
                    <div style={{ ...smallNoteStyle, marginTop: 4 }}>
                      Régime : {safeString(asset.regime)} • Rating :{" "}
                      {safeString(asset.rating)}
                    </div>
                  </div>

                  <div style={rightStyle}>
                    <div style={{ fontWeight: 800 }}>{fmtPct(asset.chg_24h_pct)}</div>
                    <div style={{ ...smallNoteStyle, marginTop: 4 }}>
                      Prix : {fmtPrice(asset.price)}
                    </div>
                  </div>
                </div>

                <div style={{ ...gridStyle, marginTop: 10 }}>
                  <div>
                    <div style={labelStyle}>7j</div>
                    <div>{fmtPct(asset.chg_7d_pct)}</div>
                  </div>
                  <div>
                    <div style={labelStyle}>30j</div>
                    <div>{fmtPct(asset.chg_30d_pct)}</div>
                  </div>
                  <div>
                    <div style={labelStyle}>Stabilité</div>
                    <div>{safeNumber(asset.stability_score) ?? "—"}</div>
                  </div>
                  <div>
                    <div style={labelStyle}>Rupture</div>
                    <div>{safeNumber(asset.rupture_rate) ?? "—"}</div>
                  </div>
                </div>

                {safeString(asset.reason, "") !== "" ? (
                  <div style={smallNoteStyle}>Motif : {safeString(asset.reason, "")}</div>
                ) : null}

                {typeof asset.binance_url === "string" &&
                asset.binance_url.trim().length > 0 ? (
                  <div style={{ marginTop: 10 }}>
                    <a
                      href={asset.binance_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        textDecoration: "none",
                      }}
                    >
                      Ouvrir Binance
                    </a>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
