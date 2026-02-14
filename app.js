/* Zilkara — app.js
   Front-only. Lit /api/state et rend le tableau.
*/
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  // ─────────────────────────────────────────────────────────────
  // Binance affiliation
  // Remplace BINANCE_REF par ton ref (ou laisse tel quel si déjà bon)
  // ─────────────────────────────────────────────────────────────
  const BINANCE_REF = "1216069378";
  const BINANCE_JOIN_URL = `https://www.binance.com/fr/register?ref=${encodeURIComponent(
    BINANCE_REF
  )}`;
  const BINANCE_TRADE_BASE = "https://www.binance.com/fr/trade/";

  // stablecoins (pour option "exclure stablecoins" / cacher bouton trade)
  const STABLES = new Set([
    "USDT",
    "USDC",
    "DAI",
    "TUSD",
    "FDUSD",
    "USDP",
    "USDD",
    "FRAX",
    "LUSD",
    "EURC",
    "EURS",
    "USDE",
    "USDS",
  ]);

  // ─────────────────────────────────────────────────────────────
  // DOM
  // ─────────────────────────────────────────────────────────────
  const els = {
    // status
    statusText: $("statusText"),
    source: $("source"),
    updated: $("updated"),
    dot: $("dot"),

    // buttons
    btnRefresh: $("btnRefresh"),
    btnRebuild: $("btnRebuild"),

    // filters / tools
    signalPreset: $("signalPreset"), // optionnel (si existe encore)
    autoRefresh: $("autoRefresh"),
    sortBy: $("sortBy"),
    sortDir: $("sortDir"),
    limit: $("limit"),
    hideStables: $("hideStables"),

    // table
    tableBody: $("tableBody"),

    // affiliate link anchors (optionnels selon ton HTML)
    binanceJoinTop: $("binanceJoinTop"),
    binanceJoinFooter: $("binanceJoinFooter"),
  };

  // set affiliate links if anchors exist
  if (els.binanceJoinTop) els.binanceJoinTop.href = BINANCE_JOIN_URL;
  if (els.binanceJoinFooter) els.binanceJoinFooter.href = BINANCE_JOIN_URL;

  // ─────────────────────────────────────────────────────────────
  // Formatters
  // ─────────────────────────────────────────────────────────────
  const fmtEUR = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  });
  const fmtPct = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const fmtInt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

  // ─────────────────────────────────────────────────────────────
  // State + persistence
  // ─────────────────────────────────────────────────────────────
  const STORAGE_KEY = "zilkara_ui_v1";

  const ui = {
    limit: 50,
    sortBy: "stability_score", // cohérent Zilkara (classement par solidité)
    sortDir: "desc",
    autoRefreshSec: 30,
    hideStables: true,
    // filtre minimal (optionnel) — si tu veux conserver le vieux preset
    minStability: null,
  };

  const state = {
    raw: [],
    timer: null,
    meta: { updated: null, source: "-" },
    lastFetchAt: 0,
  };

  function loadUI() {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (!s) return;
      const parsed = JSON.parse(s);
      Object.assign(ui, parsed || {});
    } catch (_) {}
  }

  function saveUI() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ui));
    } catch (_) {}
  }

  function applyUIToControls() {
    if (els.limit) els.limit.value = String(ui.limit);
    if (els.sortBy) els.sortBy.value = String(ui.sortBy);
    if (els.sortDir) els.sortDir.value = String(ui.sortDir);
    if (els.autoRefresh) els.autoRefresh.value = String(ui.autoRefreshSec);
    if (els.hideStables) els.hideStables.checked = !!ui.hideStables;

    // si tu as encore un preset "signalPreset"
    if (els.signalPreset && ui.minStability != null) {
      // map simple si tes options existent (sinon ignore)
      // Exemple: Off / Large(>=40) / Strict(>=70)
      const v =
        ui.minStability >= 70
          ? "strict"
          : ui.minStability >= 40
          ? "large"
          : "off";
      if ([...els.signalPreset.options].some((o) => o.value === v))
        els.signalPreset.value = v;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Status UI
  // ─────────────────────────────────────────────────────────────
  function setStatus(ok, text, meta) {
    if (els.statusText) els.statusText.textContent = text || (ok ? "OK" : "Erreur");
    if (els.source) els.source.textContent = meta?.source ?? "-";
    if (els.updated) {
      const ts = meta?.updated;
      els.updated.textContent = ts ? new Date(ts).toLocaleTimeString("fr-FR") : "-";
    }
    if (els.dot) {
      if (ok) {
        els.dot.style.background = "var(--good, #38d17a)";
        els.dot.style.boxShadow = "0 0 0 4px rgba(56, 209, 122, .12)";
      } else {
        els.dot.style.background = "var(--bad, #ff5a5a)";
        els.dot.style.boxShadow = "0 0 0 4px rgba(255, 90, 90, .12)";
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────
  function safeNum(x, fallback = 0) {
    const n = Number(x);
    return Number.isFinite(n) ? n : fallback;
  }

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function clsForPct(n) {
    if (!Number.isFinite(n)) return "";
    if (n > 0) return "positive";
    if (n < 0) return "negative";
    return "neutral";
  }

  function tradeUrlForSymbol(sym) {
    // Binance spot pair: BTC/USDT style. Ajuste si tu préfères EUR
    const base = `${BINANCE_TRADE_BASE}${encodeURIComponent(sym)}_USDT`;
    return base;
  }

  function isStable(sym) {
    return STABLES.has(String(sym || "").toUpperCase());
  }

  // ─────────────────────────────────────────────────────────────
  // Data fetch
  // ─────────────────────────────────────────────────────────────
  async function fetchState() {
    const limit = ui.limit || 50;
    const url = `/api/state?limit=${encodeURIComponent(limit)}&_=${Date.now()}`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${txt}`.trim());
    }
    const json = await res.json();

    const assets = Array.isArray(json.assets) ? json.assets : [];
    const updated = json.updated ?? null;
    const source = json.source ?? "-";

    state.raw = assets;
    state.meta = { updated, source };
    state.lastFetchAt = Date.now();

    return { assets, updated, source };
  }

  async function callRebuild() {
    // si tu as un endpoint protégé token: /api/rebuild?token=...
    // ici on tente sans token (à toi d’ajuster si tu l’as mis en place)
    const url = `/api/rebuild?_=${Date.now()}`;
    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.ok === false) {
      throw new Error(json?.error || `Rebuild failed (${res.status})`);
    }
    return json;
  }

  // ─────────────────────────────────────────────────────────────
  // Transform + sort
  // ─────────────────────────────────────────────────────────────
  function normalizeAsset(a, idx) {
    const sym = String(a?.symbol ?? "").toUpperCase();
    return {
      // identity
      rank: safeNum(a?.rank, idx + 1),
      symbol: sym,
      name: String(a?.name ?? ""),

      // context
      price: safeNum(a?.price, NaN),
      chg_24h_pct: safeNum(a?.chg_24h_pct ?? a?.change24h, NaN),
      chg_7d_pct: safeNum(a?.chg_7d_pct ?? a?.change7d, NaN),
      chg_30d_pct: safeNum(a?.chg_30d_pct ?? a?.change30d, NaN),

      // Zilkara core (RFS state)
      stability_score: safeNum(a?.stability_score ?? a?.signal, NaN),
      rating: String(a?.rating ?? ""),
      regime: String(a?.regime ?? ""),
      rupture_rate: safeNum(a?.rupture_rate ?? 0, NaN),
      similarity: safeNum(a?.similarity ?? 0, NaN),
      reason: String(a?.reason ?? ""),

      // flags
      _isStable: isStable(sym),
    };
  }

  function filterAssets(list) {
    let out = list;

    // stablecoins filter
    if (ui.hideStables) out = out.filter((x) => !x._isStable);

    // optional minimal stability filter (si tu gardes un preset)
    if (ui.minStability != null && Number.isFinite(ui.minStability)) {
      out = out.filter((x) => safeNum(x.stability_score, -1) >= ui.minStability);
    }

    return out;
  }

  function sortAssets(list) {
    const key = ui.sortBy || "stability_score";
    const dir = ui.sortDir === "asc" ? 1 : -1;

    const get = (x) => {
      switch (key) {
        case "rank":
          return safeNum(x.rank, 0);
        case "symbol":
          return x.symbol || "";
        case "name":
          return x.name || "";
        case "price":
          return safeNum(x.price, -Infinity);
        case "chg_24h_pct":
          return safeNum(x.chg_24h_pct, -Infinity);
        case "chg_7d_pct":
          return safeNum(x.chg_7d_pct, -Infinity);
        case "chg_30d_pct":
          return safeNum(x.chg_30d_pct, -Infinity);
        case "rupture_rate":
          return safeNum(x.rupture_rate, Infinity); // moins = mieux (mais on laisse le tri à l’utilisateur)
        case "similarity":
          return safeNum(x.similarity, -Infinity);
        case "stability_score":
        default:
          return safeNum(x.stability_score, -Infinity);
      }
    };

    // stable sort
    return list
      .map((x, i) => ({ x, i }))
      .sort((a, b) => {
        const av = get(a.x);
        const bv = get(b.x);

        // strings
        if (typeof av === "string" || typeof bv === "string") {
          const as = String(av);
          const bs = String(bv);
          const cmp = as.localeCompare(bs, "fr", { sensitivity: "base" });
          return cmp !== 0 ? cmp * dir : (a.i - b.i);
        }

        // numbers
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return a.i - b.i;
      })
      .map((o) => o.x);
  }

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────
  function renderTable(assets) {
    if (!els.tableBody) return;

    // Guard: table header must match this order for readability.
    // Columns recommended for V1:
    // [Crypto] [Prix] [24h] [7j] [30j] [Stabilité] [Rating] [Régime] [Ruptures] [Similarité] [Reason] [Action]
    // (If your HTML has fewer columns, it will still render but alignment depends on <th> count.)
    const rowsHtml = assets.map((a) => rowHtml(a)).join("");
    els.tableBody.innerHTML = rowsHtml || emptyRowHtml();
  }

  function emptyRowHtml() {
    return `<tr>
      <td colspan="12" style="opacity:.75;padding:18px 10px;">
        Aucune donnée (cache vide / filtre trop strict).
      </td>
    </tr>`;
  }

  function rowHtml(a) {
    const price = Number.isFinite(a.price) ? fmtEUR.format(a.price) : "-";
    const p24 = Number.isFinite(a.chg_24h_pct) ? `${fmtPct.format(a.chg_24h_pct)} %` : "-";
    const p7 = Number.isFinite(a.chg_7d_pct) ? `${fmtPct.format(a.chg_7d_pct)} %` : "-";
    const p30 = Number.isFinite(a.chg_30d_pct) ? `${fmtPct.format(a.chg_30d_pct)} %` : "-";

    const stab = Number.isFinite(a.stability_score) ? fmtInt.format(a.stability_score) : "-";
    const rr = Number.isFinite(a.rupture_rate) ? fmtPct.format(a.rupture_rate) : "-";
    const sim = Number.isFinite(a.similarity) ? `${fmtInt.format(a.similarity)} %` : "-";

    const tradeUrl = tradeUrlForSymbol(a.symbol);
    const tradeBtn =
      a._isStable
        ? `<span class="pill pill-muted">Stable</span>`
        : `<a class="tradeBtn" href="${esc(tradeUrl)}" target="_blank" rel="noopener noreferrer">Trader</a>`;

    // Asset cell: name + symbol
    const assetCell = `
      <div class="assetCell">
        <div class="assetTop">
          <span class="assetSymbol">${esc(a.symbol)}</span>
          <span class="assetName">${esc(a.name)}</span>
        </div>
      </div>
    `;

    // Regime pill
    const reg = esc(a.regime || "-");
    const regClass =
      reg === "STABLE" ? "pill-good" : reg === "TRANSITION" ? "pill-warn" : reg === "CHAOTIC" ? "pill-bad" : "pill-muted";

    // Rating pill
    const rating = esc(a.rating || "-");
    const ratingClass =
      rating === "A" ? "pill-good" : rating === "B" ? "pill-warn" : rating === "C" ? "pill-bad" : "pill-muted";

    const reason = a.reason ? esc(a.reason) : "-";

    return `
      <tr>
        <td class="col-asset">${assetCell}</td>

        <td class="col-num">${price}</td>
        <td class="col-num ${clsForPct(a.chg_24h_pct)}">${p24}</td>
        <td class="col-num ${clsForPct(a.chg_7d_pct)}">${p7}</td>
        <td class="col-num ${clsForPct(a.chg_30d_pct)}">${p30}</td>

        <td class="col-num"><span class="pill pill-score">${stab}</span></td>
        <td class="col-num"><span class="pill ${ratingClass}">${rating}</span></td>
        <td class="col-num"><span class="pill ${regClass}">${reg}</span></td>

        <td class="col-num">${rr}</td>
        <td class="col-num">${sim}</td>

        <td class="col-reason">${reason}</td>

        <td class="col-action">${tradeBtn}</td>
      </tr>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // Main update loop
  // ─────────────────────────────────────────────────────────────
  async function refresh({ silent = false } = {}) {
    try {
      if (!silent) setStatus(true, "Chargement…", state.meta);

      const { assets, updated, source } = await fetchState();
      setStatus(true, "OK", { updated, source });

      const normalized = assets.map(normalizeAsset);
      const filtered = filterAssets(normalized);
      const sorted = sortAssets(filtered);

      renderTable(sorted);
    } catch (err) {
      setStatus(false, "Erreur", state.meta);
      // en debug: afficher une ligne d’erreur
      if (els.tableBody) {
        els.tableBody.innerHTML = `<tr>
          <td colspan="12" style="padding:18px 10px;color:#ff8b8b;">
            ${esc(String(err?.message || err || "Erreur inconnue"))}
          </td>
        </tr>`;
      }
    }
  }

  function scheduleAutoRefresh() {
    // clear old
    if (state.timer) {
      clearInterval(state.timer);
      state.timer = null;
    }

    const sec = safeNum(ui.autoRefreshSec, 0);
    if (!sec || sec <= 0) return;

    state.timer = setInterval(() => {
      refresh({ silent: true });
    }, sec * 1000);
  }

  // ─────────────────────────────────────────────────────────────
  // Events
  // ─────────────────────────────────────────────────────────────
  function wireEvents() {
    if (els.btnRefresh) {
      els.btnRefresh.addEventListener("click", () => refresh());
    }

    if (els.btnRebuild) {
      els.btnRebuild.addEventListener("click", async () => {
        try {
          setStatus(true, "Rebuild…", state.meta);
          await callRebuild();
          await refresh();
        } catch (e) {
          setStatus(false, "Erreur", state.meta);
          alert(String(e?.message || e || "Rebuild error"));
        }
      });
    }

    if (els.limit) {
      els.limit.addEventListener("change", () => {
        ui.limit = safeNum(els.limit.value, 50);
        saveUI();
        refresh();
      });
    }

    if (els.sortBy) {
      els.sortBy.addEventListener("change", () => {
        ui.sortBy = els.sortBy.value;
        saveUI();
        refresh({ silent: true });
      });
    }

    if (els.sortDir) {
      els.sortDir.addEventListener("change", () => {
        ui.sortDir = els.sortDir.value;
        saveUI();
        refresh({ silent: true });
      });
    }

    if (els.autoRefresh) {
      els.autoRefresh.addEventListener("change", () => {
        ui.autoRefreshSec = safeNum(els.autoRefresh.value, 0);
        saveUI();
        scheduleAutoRefresh();
      });
    }

    if (els.hideStables) {
      els.hideStables.addEventListener("change", () => {
        ui.hideStables = !!els.hideStables.checked;
        saveUI();
        refresh({ silent: true });
      });
    }

    // Optional: old preset mapping
    if (els.signalPreset) {
      els.signalPreset.addEventListener("change", () => {
        const v = els.signalPreset.value;
        if (v === "strict") ui.minStability = 70;
        else if (v === "large") ui.minStability = 40;
        else ui.minStability = null;

        saveUI();
        refresh({ silent: true });
      });
    }

    // Click-to-sort on headers if you added data-sort on <th>
    const table = $("marketTable");
    if (table) {
      const ths = table.querySelectorAll("thead th[data-sort]");
      ths.forEach((th) => {
        th.style.cursor = "pointer";
        th.addEventListener("click", () => {
          const k = th.getAttribute("data-sort");
          if (!k) return;

          // toggle if same key
          if (ui.sortBy === k) ui.sortDir = ui.sortDir === "asc" ? "desc" : "asc";
          else ui.sortBy = k;

          saveUI();
          if (els.sortBy) els.sortBy.value = ui.sortBy;
          if (els.sortDir) els.sortDir.value = ui.sortDir;

          refresh({ silent: true });
        });
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Init
  // ─────────────────────────────────────────────────────────────
  function init() {
    loadUI();

    // defaults safety (in case controls send weird values)
    if (!Number.isFinite(ui.limit) || ui.limit <= 0) ui.limit = 50;
    if (!ui.sortBy) ui.sortBy = "stability_score";
    if (!ui.sortDir) ui.sortDir = "desc";
    if (!Number.isFinite(ui.autoRefreshSec)) ui.autoRefreshSec = 30;

    applyUIToControls();
    wireEvents();
    scheduleAutoRefresh();
    refresh();
  }

  // DOM ready (script is defer normally, but safe)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
