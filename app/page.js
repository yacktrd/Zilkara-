// app/page.js
"use client";

// deploy refresh
import { useEffect, useMemo, useState } from "react";

const REFRESH_MS = 60_000;

function fmtPrice(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  // affichage lisible mobile : 2–8 décimales selon la taille
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (n >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 8 });
}

function fmtScore(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return Math.round(n).toString();
}

function safeUpper(s) {
  return (s || "").toString().trim().toUpperCase();
}

function ratingColor(rating) {
  const r = safeUpper(rating);
  // minimal + perceptif : A vert, B bleu, C orange, D rouge, sinon gris
  if (r === "A") return "var(--good)";
  if (r === "B") return "var(--ok)";
  if (r === "C") return "var(--warn)";
  if (r === "D") return "var(--bad)";
  return "var(--muted)";
}

function buildBinanceUrl(symbol, affiliateId) {
  // On suppose des paires type BTCUSDT
  const s = safeUpper(symbol);
  if (!s) return null;

  // Binance "market" URL assez standard
  // Ajout d’affiliation si fournie (param "ref" souvent utilisé).
  const base = `https://www.binance.com/en/trade/${encodeURIComponent(s)}`;
  if (!affiliateId) return base;
  return `${base}?ref=${encodeURIComponent(affiliateId)}`;
}

export default function Page() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [status, setStatus] = useState({ loading: true, error: null });
  const [sortDir, setSortDir] = useState("desc"); // "desc" = score haut en premier
  const [affiliateId, setAffiliateId] = useState(""); // peut aussi venir de /api/scan meta
  const [limitNote, setLimitNote] = useState(""); // feedback discret

  async function load() {
    setStatus((s) => ({ ...s, loading: true, error: null }));

    try {
      // On force un fetch “frais” côté client (évite confusion cache navigateur)
      const res = await fetch("/api/scan?limit=250", { cache: "no-store" });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json) {
        throw new Error(`HTTP ${res.status}`);
      }

      if (json.ok !== true) {
        const msg = json?.error?.message || json?.error || "Erreur inconnue";
        throw new Error(msg);
      }

      const data = Array.isArray(json.data) ? json.data : [];

      // meta optionnelle
      setMeta({
        ts: json.ts || json.updatedAt || null,
        count: json.count ?? data.length,
      });

      // Affiliation : si le backend fournit un affiliateId, on le garde
      if (json?.meta?.binanceAffiliateId && !affiliateId) {
        setAffiliateId(String(json.meta.binanceAffiliateId));
      }

      // note de limite (si jamais backend limite encore)
      if (data.length < 200) {
        setLimitNote(`Affichage: ${data.length} actifs`);
      } else {
        setLimitNote("");
      }

      setRows(data);
      setStatus({ loading: false, error: null });
    } catch (e) {
      setStatus({ loading: false, error: e?.message || "Erreur" });
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    const copy = [...rows];

    // tri stable sur score desc/asc puis symbole
    copy.sort((a, b) => {
      const sa = Number(a?.stability_score ?? a?.score ?? a?.stabilityScore);
      const sb = Number(b?.stability_score ?? b?.score ?? b?.stabilityScore);

      const na = Number.isFinite(sa) ? sa : -Infinity;
      const nb = Number.isFinite(sb) ? sb : -Infinity;

      if (na !== nb) return (na - nb) * dir;

      const as = safeUpper(a?.symbol ?? a?.ticker ?? a?.id);
      const bs = safeUpper(b?.symbol ?? b?.ticker ?? b?.id);
      return as.localeCompare(bs);
    });

    return copy;
  }, [rows, sortDir]);

  const lastUpdated = useMemo(() => {
    if (!meta?.ts) return "—";
    try {
      const d = new Date(meta.ts);
      if (isNaN(d.getTime())) return String(meta.ts);
      return d.toLocaleString();
    } catch {
      return String(meta.ts);
    }
  }, [meta]);

  return (
    <main className="wrap">
      <header className="top">
        <div className="titleBlock">
          <div className="brand">Zilkara</div>
          <div className="sub">
            Scanner crypto — lecture rapide.{" "}
            <span className="muted">MAJ: {lastUpdated}</span>
          </div>
        </div>

        <div className="actions">
          <button className="btn" onClick={load} disabled={status.loading}>
            {status.loading ? "Chargement…" : "Rafraîchir"}
          </button>
        </div>
      </header>

      <section className="panel">
        <div className="panelRow">
          <div className="left">
            <div className="kpi">
              <div className="kpiLabel">Actifs</div>
              <div className="kpiValue">{meta?.count ?? rows.length}</div>
            </div>

            <div className="kpi">
              <div className="kpiLabel">Tri</div>
              <div className="kpiValue">
                Score{" "}
                <button
                  className="link"
                  onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
                  aria-label="Changer l’ordre de tri"
                >
                  {sortDir === "desc" ? "↓" : "↑"}
                </button>
              </div>
            </div>

            {limitNote ? <div className="note">{limitNote}</div> : null}
          </div>

          <div className="right">
            {/* Affiliation Binance : champ discret (optionnel) */}
            <div className="aff">
              <div className="affLabel">Binance ref</div>
              <input
                className="input"
                value={affiliateId}
                onChange={(e) => setAffiliateId(e.target.value)}
                placeholder="(optionnel)"
                inputMode="text"
                aria-label="Identifiant d’affiliation Binance"
              />
            </div>
          </div>
        </div>

        {status.error ? (
          <div className="error" role="alert">
            <div className="errorTitle">Erreur</div>
            <div className="errorMsg">{status.error}</div>
            <div className="errorHint">
              Vérifie <span className="mono">/api/scan</span> et le domaine (zilkara.app).
            </div>
          </div>
        ) : null}

        <div className="tableWrap" aria-busy={status.loading ? "true" : "false"}>
          <table className="table">
            <thead>
              <tr>
                <th className="colSymbol">Symbole</th>
                <th className="colNum">Prix</th>
                <th className="colNum">Score</th>
                <th className="colRating">Rating</th>
              </tr>
            </thead>

            <tbody>
              {sorted.map((it, idx) => {
                const symbol = safeUpper(it?.symbol ?? it?.ticker ?? it?.id);
                const price = it?.price ?? it?.last ?? it?.last_price;
                const score = it?.stability_score ?? it?.score ?? it?.stabilityScore;
                const rating = it?.rating ?? it?.grade ?? it?.rank;

                const binanceUrl =
                  it?.binance_url ||
                  buildBinanceUrl(symbol, affiliateId || it?.binance_ref || it?.affiliateId);

                return (
                  <tr key={`${symbol || "row"}-${idx}`}>
                    <td className="colSymbol">
                      {binanceUrl ? (
                        <a className="symbolLink" href={binanceUrl} target="_blank" rel="noreferrer">
                          {symbol || "—"}
                        </a>
                      ) : (
                        <span className="symbolText">{symbol || "—"}</span>
                      )}
                    </td>

                    <td className="colNum mono">{fmtPrice(price)}</td>

                    <td className="colNum mono">
                      <span className="scorePill">{fmtScore(score)}</span>
                    </td>

                    <td className="colRating">
                      <span
                        className="ratingPill"
                        style={{ borderColor: ratingColor(rating), color: ratingColor(rating) }}
                      >
                        {safeUpper(rating) || "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {!status.loading && sorted.length === 0 ? (
                <tr>
                  <td colSpan={4} className="empty">
                    Aucune donnée.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <footer className="foot">
          <span className="muted">
            Auto-refresh: {Math.round(REFRESH_MS / 1000)}s •{" "}
            <span className="mono">/api/scan</span>
          </span>
        </footer>
      </section>

      <style jsx global>{`
        :root {
          --bg: #0b0d10;
          --panel: #10141a;
          --text: #e7edf5;
          --muted: #8b98ab;
          --line: rgba(255, 255, 255, 0.08);
          --good: #4ade80;
          --ok: #60a5fa;
          --warn: #fb923c;
          --bad: #f87171;
        }

        html,
        body {
          background: var(--bg);
          color: var(--text);
          margin: 0;
          padding: 0;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Apple Color Emoji",
            "Segoe UI Emoji";
        }

        * {
          box-sizing: border-box;
        }

        .wrap {
          max-width: 980px;
          margin: 0 auto;
          padding: 16px 14px 28px;
        }

        .top {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 12px;
          margin-bottom: 12px;
        }

        .brand {
          font-size: 22px;
          font-weight: 700;
          letter-spacing: 0.2px;
          line-height: 1.1;
        }

        .sub {
          margin-top: 4px;
          font-size: 13px;
          color: var(--muted);
        }

        .muted {
          color: var(--muted);
        }

        .mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New",
            monospace;
        }

        .actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .btn {
          background: rgba(255, 255, 255, 0.06);
          color: var(--text);
          border: 1px solid var(--line);
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 13px;
          cursor: pointer;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: default;
        }

        .panel {
          background: var(--panel);
          border: 1px solid var(--line);
          border-radius: 14px;
          overflow: hidden;
        }

        .panelRow {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 12px;
          border-bottom: 1px solid var(--line);
        }

        .left {
          display: flex;
          gap: 14px;
          align-items: center;
          flex-wrap: wrap;
        }

        .right {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          min-width: 220px;
        }

        .kpi {
          display: grid;
          gap: 2px;
        }

        .kpiLabel {
          font-size: 11px;
          color: var(--muted);
        }

        .kpiValue {
          font-size: 14px;
          font-weight: 600;
        }

        .link {
          background: transparent;
          border: none;
          color: var(--text);
          font-size: 14px;
          cursor: pointer;
          padding: 0 4px;
        }

        .note {
          font-size: 12px;
          color: var(--muted);
        }

        .aff {
          display: grid;
          gap: 4px;
          width: 100%;
        }

        .affLabel {
          font-size: 11px;
          color: var(--muted);
          text-align: right;
        }

        .input {
          width: 100%;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--line);
          color: var(--text);
          padding: 10px 10px;
          border-radius: 10px;
          font-size: 13px;
          outline: none;
        }

        .input::placeholder {
          color: rgba(139, 152, 171, 0.7);
        }

        .error {
          padding: 12px;
          border-bottom: 1px solid var(--line);
          background: rgba(248, 113, 113, 0.08);
        }

        .errorTitle {
          font-weight: 700;
          margin-bottom: 4px;
        }

        .errorMsg {
          color: var(--text);
          font-size: 13px;
        }

        .errorHint {
          margin-top: 6px;
          font-size: 12px;
          color: var(--muted);
        }

        .tableWrap {
          overflow-x: auto;
        }

        .table {
          width: 100%;
          border-collapse: collapse;
        }

        th,
        td {
          padding: 12px 12px;
          border-bottom: 1px solid var(--line);
          vertical-align: middle;
          white-space: nowrap;
        }

        th {
          font-size: 11px;
          color: var(--muted);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .colSymbol {
          text-align: left;
          width: 44%;
        }

        .colNum {
          text-align: right;
          width: 18%;
        }

        .colRating {
          text-align: right;
          width: 20%;
        }

        .symbolLink {
          color: var(--text);
          text-decoration: none;
          font-weight: 650;
        }

        .symbolLink:active {
          opacity: 0.8;
        }

        .symbolText {
          font-weight: 650;
        }

        .scorePill {
          display: inline-block;
          min-width: 44px;
          text-align: right;
        }

        .ratingPill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 42px;
          padding: 4px 8px;
          border-radius: 999px;
          border: 1px solid var(--line);
          font-weight: 700;
          font-size: 12px;
        }

        .empty {
          text-align: center;
          color: var(--muted);
          padding: 18px 12px;
        }

        .foot {
          padding: 10px 12px;
          font-size: 12px;
        }

        /* Mobile-first : densité contrôlée, zéro zoom */
        @media (max-width: 560px) {
          .wrap {
            padding: 12px 10px 22px;
          }

          .top {
            align-items: flex-start;
          }

          .brand {
            font-size: 20px;
          }

          th,
          td {
            padding: 10px 10px;
          }

          .panelRow {
            flex-direction: column;
            align-items: stretch;
          }

          .right {
            min-width: 0;
          }

          .affLabel {
            text-align: left;
          }

          .colSymbol {
            width: 42%;
          }
        }
      `}</style>
    </main>
  );
}
