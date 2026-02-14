"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const SIGNAL_FILTERS = [
  { label: "Large (≥ 40)", min: 40 },
  { label: "Medium (≥ 25)", min: 25 },
  { label: "Small (≥ 10)", min: 10 },
  { label: "All (≥ 0)", min: 0 },
];

const REFRESH_OPTIONS = [
  { label: "Off", ms: 0 },
  { label: "10s", ms: 10_000 },
  { label: "30s", ms: 30_000 },
  { label: "60s", ms: 60_000 },
];

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function fmtUpdated(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("fr-FR", { hour12: false });
}

function Badge({ tone = "neutral", children }) {
  const bg =
    tone === "ok"
      ? "rgba(46, 204, 113, 0.15)"
      : tone === "warn"
      ? "rgba(241, 196, 15, 0.15)"
      : tone === "err"
      ? "rgba(231, 76, 60, 0.15)"
      : "rgba(255,255,255,0.08)";
  const bd =
    tone === "ok"
      ? "rgba(46, 204, 113, 0.35)"
      : tone === "warn"
      ? "rgba(241, 196, 15, 0.35)"
      : tone === "err"
      ? "rgba(231, 76, 60, 0.35)"
      : "rgba(255,255,255,0.14)";
  const dot =
    tone === "ok"
      ? "rgba(46, 204, 113, 1)"
      : tone === "warn"
      ? "rgba(241, 196, 15, 1)"
      : tone === "err"
      ? "rgba(231, 76, 60, 1)"
      : "rgba(255,255,255,0.7)";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        borderRadius: 999,
        border: `1px solid ${bd}`,
        background: bg,
        fontSize: 14,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 9,
          height: 9,
          borderRadius: 999,
          background: dot,
          boxShadow: `0 0 0 3px rgba(0,0,0,0.25)`,
        }}
      />
      <span style={{ opacity: 0.95 }}>{children}</span>
    </span>
  );
}

function Pill({ children }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(255,255,255,0.06)",
        fontSize: 12,
        opacity: 0.95,
      }}
    >
      {children}
    </span>
  );
}

function Button({ onClick, disabled, children, kind = "primary" }) {
  const bg =
    kind === "primary" ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.06)";
  const bd =
    kind === "primary" ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.12)";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        height: 48,
        borderRadius: 14,
        border: `1px solid ${bd}`,
        background: bg,
        color: "rgba(255,255,255,0.92)",
        fontSize: 16,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {children}
    </button>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        height: 52,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(255,255,255,0.06)",
        color: "rgba(255,255,255,0.92)",
        fontSize: 16,
        padding: "0 14px",
        outline: "none",
        appearance: "none",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} style={{ color: "#000" }}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

async function fetchJSON(url, { method = "GET", timeoutMs = 12000 } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method,
      cache: "no-store",
      headers: { "cache-control": "no-store" },
      signal: controller.signal,
    });

    // Garde-fou : on essaie de lire le JSON même en erreur (Vercel renvoie parfois du HTML)
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    if (!res.ok) {
      const msg =
        (json && (json.error || json.message)) ||
        `HTTP ${res.status} ${res.statusText}`;
      const err = new Error(msg);
      err.status = res.status;
      err.payload = json;
      throw err;
    }

    return json;
  } finally {
    clearTimeout(t);
  }
}

export default function Page() {
  const [signalMin, setSignalMin] = useState(40);
  const [refreshMs, setRefreshMs] = useState(30_000);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [source, setSource] = useState("—");
  const [updated, setUpdated] = useState(null);
  const [assets, setAssets] = useState([]);

  const refreshTimer = useRef(null);
  const mounted = useRef(false);

  const filteredAssets = useMemo(() => {
    const min = Number(signalMin) || 0;
    return (assets || [])
      .filter((a) => (Number(a?.signal ?? a?.stability_score ?? 0) || 0) >= min)
      .sort((a, b) => {
        const sa = Number(a?.signal ?? a?.stability_score ?? 0) || 0;
        const sb = Number(b?.signal ?? b?.stability_score ?? 0) || 0;
        return sb - sa;
      });
  }, [assets, signalMin]);

  function statusTone() {
    if (loading) return "neutral";
    if (error) return "err";
    return "ok";
  }

  async function loadState() {
    setError("");
    setBusy(true);
    try {
      const data = await fetchJSON("/api/state", { method: "GET" });
      if (!mounted.current) return;

      setAssets(Array.isArray(data?.assets) ? data.assets : []);
      setSource(data?.source || "—");

      // updated peut être en ms, en s, ou absent -> on normalise
      const raw = data?.updated;
      let ts = null;
      if (typeof raw === "number") {
        // si c’est en secondes (10 chiffres), on convertit en ms
        ts = raw < 2_000_000_000_000 ? raw * 1000 : raw;
      } else if (typeof raw === "string") {
        const n = Number(raw);
        if (!Number.isNaN(n)) {
          ts = n < 2_000_000_000_000 ? n * 1000 : n;
        } else {
          const d = new Date(raw);
          ts = Number.isNaN(d.getTime()) ? null : d.getTime();
        }
      }
      setUpdated(ts || Date.now());
    } catch (e) {
      if (!mounted.current) return;
      setError(e?.message || "Problème de récupération des données.");
      // on garde les dernières données si elles existent
    } finally {
      if (!mounted.current) return;
      setBusy(false);
      setLoading(false);
    }
  }

  async function rebuildCache() {
    setError("");
    setBusy(true);
    try {
      // Endpoint unique : /api/rebuild-cache
      const data = await fetchJSON("/api/rebuild-cache", { method: "GET", timeoutMs: 25000 });

      // Optionnel : si l’API renvoie ok/message
      if (data?.ok === true) {
        // on relit l’état juste après rebuild
        await loadState();
      } else {
        await loadState();
      }
    } catch (e) {
      if (!mounted.current) return;
      setError(e?.message || "Rebuild KO.");
    } finally {
      if (!mounted.current) return;
      setBusy(false);
    }
  }

  // Initial load
  useEffect(() => {
    mounted.current = true;
    loadState();
    return () => {
      mounted.current = false;
      if (refreshTimer.current) clearInterval(refreshTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (refreshTimer.current) clearInterval(refreshTimer.current);
    if (!refreshMs || Number(refreshMs) <= 0) return;

    refreshTimer.current = setInterval(() => {
      // évite d’empiler des requêtes
      if (!busy) loadState();
    }, Number(refreshMs));

    return () => {
      if (refreshTimer.current) clearInterval(refreshTimer.current);
      refreshTimer.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshMs, busy]);

  const signalOptions = SIGNAL_FILTERS.map((f) => ({
    value: String(f.min),
    label: f.label,
  }));

  const refreshOptions = REFRESH_OPTIONS.map((r) => ({
    value: String(r.ms),
    label: r.label,
  }));

  const headerNote =
    "Signal = score technique (0–100) basé sur liquidité, taille, turnover et momentum (24h). Plus c’est élevé, plus l’actif est “propre” à surveiller.";

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "28px 16px 40px",
        background:
          "radial-gradient(1200px 700px at 20% 0%, rgba(255,255,255,0.08), rgba(0,0,0,0) 60%), linear-gradient(180deg, #0b0c10 0%, #07080b 100%)",
        color: "rgba(255,255,255,0.92)",
        fontFamily:
          'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <h1
          style={{
            fontSize: 38,
            letterSpacing: 0.2,
            margin: "6px 0 10px",
            fontWeight: 800,
          }}
        >
          Zilkara — Market Scanner
        </h1>

        <p style={{ opacity: 0.75, margin: "0 0 18px", lineHeight: 1.45 }}>
          {headerNote}
        </p>

        <div
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 18,
            background: "rgba(255,255,255,0.04)",
            padding: 16,
            boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
          }}
        >
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, opacity: 0.65, marginBottom: 8 }}>
                Filtre signal
              </div>
              <Select
                value={String(signalMin)}
                onChange={(v) => setSignalMin(clamp(Number(v), 0, 100))}
                options={signalOptions}
              />
            </div>

            <div>
              <div style={{ fontSize: 13, opacity: 0.65, marginBottom: 8 }}>
                Auto-refresh
              </div>
              <Select
                value={String(refreshMs)}
                onChange={(v) => setRefreshMs(Number(v))}
                options={refreshOptions}
              />
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <Button onClick={loadState} disabled={busy}>
                {busy ? "…" : "Rafraîchir"}
              </Button>

              <Button onClick={rebuildCache} disabled={busy} kind="secondary">
                {busy ? "…" : "Rebuild cache"}
              </Button>
            </div>

            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.08)",
                paddingTop: 12,
              }}
            >
              <button
                onClick={() => setAdvancedOpen((s) => !s)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: "transparent",
                  border: "none",
                  color: "rgba(255,255,255,0.90)",
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: "10px 2px",
                }}
              >
                {advancedOpen ? "▼ Avancé" : "▶ Avancé"}
              </button>

              {advancedOpen && (
                <div
                  style={{
                    marginTop: 10,
                    borderRadius: 16,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(0,0,0,0.20)",
                    padding: 14,
                    display: "grid",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      flexWrap: "wrap",
                      justifyContent: "space-between",
                    }}
                  >
                    <Badge tone={statusTone()}>
                      {loading ? "Chargement…" : error ? "Erreur" : "OK"}
                    </Badge>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Pill>MAJ : {fmtUpdated(updated)}</Pill>
                      <Pill>Source : {source || "—"}</Pill>
                      <Pill>
                        Items :{" "}
                        {Array.isArray(filteredAssets)
                          ? filteredAssets.length
                          : 0}
                      </Pill>
                    </div>
                  </div>

                  {error ? (
                    <div style={{ opacity: 0.85, fontSize: 14 }}>
                      {error}
                    </div>
                  ) : null}

                  <div style={{ opacity: 0.6, fontSize: 13, lineHeight: 1.5 }}>
                    Remarque : cette UI ne “conseille” rien. Elle affiche et filtre des métriques.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ height: 16 }} />

        <div
          style={{
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.03)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 14px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontWeight: 800 }}>Assets</div>
            <div style={{ opacity: 0.6, fontSize: 13 }}>
              Affichage : signal ≥ {signalMin}
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 16, opacity: 0.75 }}>Chargement…</div>
          ) : filteredAssets.length === 0 ? (
            <div style={{ padding: 16, opacity: 0.75 }}>
              Aucune donnée (ou aucun actif ne passe le filtre).
            </div>
          ) : (
            <div style={{ display: "grid" }}>
              {filteredAssets.map((a) => {
                const key = a?.symbol || a?.name || Math.random().toString(16);
                const price = a?.price ?? "—";
                const signal = Number(a?.signal ?? a?.stability_score ?? 0) || 0;
                const rating = a?.rating ?? "—";
                const regime = a?.regime ?? "—";
                const chg24 = a?.chg_24h_pct;
                const chg7 = a?.chg_7d_pct;
                const chg30 = a?.chg_30d_pct;
                const reason = a?.reason;

                return (
                  <div
                    key={key}
                    style={{
                      padding: 14,
                      borderTop: "1px solid rgba(255,255,255,0.06)",
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ fontSize: 16, fontWeight: 800 }}>
                          {a?.name || "—"}{" "}
                          <span style={{ opacity: 0.7, fontWeight: 700 }}>
                            ({a?.symbol || "—"})
                          </span>
                        </div>
                        <Pill>Signal : {signal}</Pill>
                        <Pill>Rating : {rating}</Pill>
                        <Pill>Régime : {regime}</Pill>
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <Pill>Prix : {price}</Pill>
                        {typeof chg24 !== "undefined" ? (
                          <Pill>24h : {chg24}%</Pill>
                        ) : null}
                        {typeof chg7 !== "undefined" ? (
                          <Pill>7j : {chg7}%</Pill>
                        ) : null}
                        {typeof chg30 !== "undefined" ? (
                          <Pill>30j : {chg30}%</Pill>
                        ) : null}
                      </div>
                    </div>

                    {reason ? (
                      <div style={{ opacity: 0.72, fontSize: 13, lineHeight: 1.4 }}>
                        {reason}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
