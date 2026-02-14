/* Zilkara — app.js
   Front UI: fetch /api/state, apply local filters/sort, render aligned table, Binance affiliation links.
   Requirements: index.html must contain the IDs referenced below.
*/
(() => {
  const $ = (id) => document.getElementById(id);

  // ─────────────────────────────────────────────────────────────
  // Binance affiliation (edit REF if needed)
  // ─────────────────────────────────────────────────────────────
  const BINANCE_REF = "1216069378";
  const BINANCE_JOIN_URL =
    `https://www.binance.com/fr/register?ref=${encodeURIComponent(BINANCE_REF)}`;
  const BINANCE_TRADE_BASE = "https://www.binance.com/fr/trade/";

  // Known stablecoins to optionally hide (UI toggle)
  const STABLES = new Set([
    "USDT", "USDC", "DAI", "TUSD", "FDUSD", "USDP", "USDD", "FRAX",
    "LUSD", "EURC", "EURS", "USDE", "USDS"
  ]);

  // ─────────────────────────────────────────────────────────────
  // UI refs (must match index.html IDs)
  // ─────────────────────────────────────────────────────────────
  const els = {
    // status
    statusText: $("statusText"),
    updated: $("updated"),
    source: $("source"),
    dot: $("dot"),
    hint: $("hint"),

    // buttons
    btnRefresh: $("btnRefresh"),
    btnRebuild: $("btnRebuild"),

    // controls
    signalPreset: $("signalPreset"),
    autoRefresh: $("autoRefresh"),
    sortBy: $("sortBy"),
    sortDir: $("sortDir"),
    limit: $("limit"),
    // accept either id="hideStables" or id="stableMode"
    hideStables: $("hideStables") || $("stableMode"),

    // affiliate links
    binanceJoinTop: $("binanceJoinTop"),
    binanceJoinBottom: $("binanceJoinBottom"),

    // table
    tableBody: $("tableBody"),
  };

  // Wire affiliate links if present
  if (els.binanceJoinTop) els.binanceJoinTop.href = BINANCE_JOIN_URL;
  if (els.binanceJoinBottom) els.binanceJoinBottom.href = BINANCE_JOIN_URL;

  // ─────────────────────────────────────────────────────────────
  // Formatters
  // ─────────────────────────────────────────────────────────────
  const fmtEUR = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  });

  const fmtPct = new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
  });

  const fmtInt = new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  });

  // ─────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────
  const state = {
    raw: [],         // assets from API
    view: [],        // filtered+sorted slice
    timer: null,     // auto refresh interval
    meta: { updated: null, source: "—" },
    lastOk: null,
  };

  // ─────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────
  function safeNum(x, fallback = 0) {
    const n = Number(x);
    return Number.isFinite(n) ? n : fallback;
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function classForPct(v) {
    const n = safeNum(v, 0);
    if (n > 0) return "positive";
    if (n < 0) return "negative";
    return "neutral";
  }

  function fmtTimeFR(ms) {
    if (!ms) return "—";
    try {
      return new Date(ms).toLocaleTimeString("fr-FR", { hour12: false });
    } catch {
      return "—";
    }
  }

  function setStatus(ok, text, meta = state.meta) {
    state.lastOk = ok;

    if (els.statusText) els.statusText.textContent = text || (ok ? "OK" : "Erreur");
    if (els.source) els.source.textContent = meta?.source ?? "—";
    if (els.updated) els.updated.textContent = meta?.updated ? fmtTimeFR(meta.updated) : "—";

    if (els.dot) {
      if (ok) {
        els.dot.style.background = "var(--good, #38d17a)";
        els.dot.style.boxShadow = "0 0 8px rgba(56,209,122,.25)";
      } else {
        els.dot.style.background = "var(--bad, #ff5a3a)";
        els.dot.style.boxShadow = "0 0 8px rgba(255,90,58,.25)";
      }
    }

    // Optional hint text (keep minimal)
    if (els.hint) {
      if (!ok) els.hint.textContent = "Problème de récupération des données.";
      else els.hint.textContent = "";
    }
  }

  function getSignalMinFromPreset() {
    // UI can be a preset select with values like: 0, 10, 30, 40, 60, 120 etc.
    const v = els.signalPreset ? els.signalPreset.value : "";
    const n = safeNum(v, 0);

    // If user uses "Large (≥ 40)" etc, we map if string contains digits
    if (!Number.isFinite(n) || n === 0) {
      const m = String(v).match(/(\d+)/);
      return m ? safeNum(m[1], 0) : 0;
    }
    // clamp 0-100 for stability_score scale (0-100)
    return Math.max(0, Math.min(100, n));
  }

  function shouldHideStables() {
    // checkbox default checked in your screenshots
    if (!els.hideStables) return false;
    // checkbox OR select
    if (els.hideStables.type === "checkbox") return !!els.hideStables.checked;
    // if it's a select like "on/off"
    return String(els.hideStables.value).toLowerCase() === "on" ||
           String(els.hideStables.value).toLowerCase() === "true" ||
           String(els.hideStables.value).toLowerCase() === "1";
  }

  function getSort() {
    const key = els.sortBy ? els.sortBy.value : "stability_score";
    const dir = els.sortDir ? els.sortDir.value : "desc";
    return { key, dir };
  }

  function getLimit() {
    const v = els.limit ? els.limit.value : "50";
    const n = safeNum(v, 50);
    return Math.max(1, Math.min(500, n));
  }

  function normalizeAsset(a) {
    // expected from /api/state:
    // symbol, name, price, chg_24h_pct, chg_7d_pct, chg_30d_pct,
    // stability_score, rating, regime, similarity, rupture_rate, reason
    const symbol = String(a?.symbol ?? "").toUpperCase().trim();
    const name = String(a?.name ?? "").trim();

    return {
      symbol,
      name,
      price: safeNum(a?.price, 0),
      chg_24h_pct: safeNum(a?.chg_24h_pct, 0),
      chg_7d_pct: safeNum(a?.chg_7d_pct, 0),
      chg_30d_pct: safeNum(a?.chg_30d_pct, 0),
      stability_score: safeNum(a?.stability_score, 0),
      rating: String(a?.rating ?? "").trim(),
      regime: String(a?.regime ?? "").trim(), // STABLE/TRANSITION/CHAOTIC
      similarity: safeNum(a?.similarity, 0),
      rupture_rate: safeNum(a?.rupture_rate, 0),
      reason: String(a?.reason ?? "").trim(),
    };
  }

  function compare(a, b, key, dir) {
    const mul = dir === "asc" ? 1 : -1;

    const av = a[key];
    const bv = b[key];

    // numbers
    if (typeof av === "number" && typeof bv === "number") {
      if (av < bv) return -1 * mul;
      if (av > bv) return  1 * mul;
      return 0;
    }

    // strings
    const as = String(av ?? "");
    const bs = String(bv ?? "");
    return as.localeCompare(bs, "fr", { sensitivity: "base" }) * mul;
  }

  function computeView() {
    const minSignal = getSignalMinFromPreset();
    const hideStables = shouldHideStables();
    const { key, dir } = getSort();
    const limit = getLimit();

    let arr = state.raw.map(normalizeAsset);

    // Filter stablecoins (by symbol)
    if (hideStables) {
      arr = arr.filter((a) => !STABLES.has(a.symbol));
    }

    // Filter by stability_score threshold (Signal in Zilkara now maps to stability_score)
    if (minSignal > 0) {
      arr = arr.filter((a) => a.stability_score >= minSignal);
    }

    // Sort
    // Default: stability_score desc
    const sortKey = key || "stability_score";
    const sortDir = dir || "desc";

    arr.sort((a, b) => {
      // force stable sort tie-breakers
      const primary = compare(a, b, sortKey, sortDir);
      if (primary !== 0) return primary;

      // tie-breaker: higher stability_score first
      const t1 = compare(a, b, "stability_score", "desc");
      if (t1 !== 0) return t1;

      // then by symbol
      return compare(a, b, "symbol", "asc");
    });

    state.view = arr.slice(0, limit);
  }

  function makeTradeUrl(symbol) {
    // Binance uses pairs like BTC_USDT, but you can point to search.
    // Keep it simple: trade page with query
    // Alternatively: `${BINANCE_TRADE_BASE}${symbol}_USDT`
    return `${BINANCE_TRADE_BASE}${encodeURIComponent(symbol)}_USDT`;
  }

  // ─────────────────────────────────────────────────────────────
  // Rendering
  // ─────────────────────────────────────────────────────────────
  function render() {
    computeView();

    if (!els.tableBody) return;

    const rows = state.view.map((a) => {
      const sym = escapeHtml(a.symbol);
      const nm = escapeHtml(a.name);

      const price = fmtEUR.format(a.price);
      const p24 = fmtPct.format(a.chg_24h_pct) + " %";
      const p7  = fmtPct.format(a.chg_7d_pct) + " %";
      const p30 = fmtPct.format(a.chg_30d_pct) + " %";

      const score = fmtInt.format(a.stability_score);
      const rating = escapeHtml(a.rating || "—");
      const regime = escapeHtml(a.regime || "—");
      const sim = fmtPct.format(a.similarity) + " %";
      const rr = fmtPct.format(a.rupture_rate);

      const reason = escapeHtml(a.reason || "");

      // Optional trade link per row
      const tradeUrl = makeTradeUrl(a.symbol);

      return `
        <tr>
          <td class="col-asset">
            <div class="assetCell">
              <div class="assetTop">
                <span class="symbol">${sym}</span>
                <span class="name">${nm}</span>
              </div>
              <div class="assetBottom">
                <a class="tradeLink" href="${tradeUrl}" target="_blank" rel="noopener noreferrer">
                  Trader sur Binance
                </a>
              </div>
            </div>
          </td>

          <td class="col-num">${price}</td>

          <td class="col-num ${classForPct(a.chg_24h_pct)}">${p24}</td>
          <td class="col-num ${classForPct(a.chg_7d_pct)}">${p7}</td>
          <td class="col-num ${classForPct(a.chg_30d_pct)}">${p30}</td>

          <td class="col-num">
            <span class="scorePill">${score}</span>
          </td>

          <td class="col-center">
            <span class="ratingPill rating-${rating}">${rating}</span>
          </td>

          <td class="col-center">
            <span class="regimePill regime-${regime}">${regime}</span>
          </td>

          <td class="col-num">${sim}</td>
          <td class="col-num">${rr}</td>

          <td class="col-reason" title="${reason}">${reason}</td>
        </tr>
      `;
    }).join("");

    els.tableBody.innerHTML = rows || `
      <tr>
        <td colspan="10" style="padding:16px; opacity:.8;">
          Aucun résultat (filtre trop strict ou données absentes).
        </td>
      </tr>
    `;

    // Update status from meta
    setStatus(true, "OK", state.meta);
  }

  // ─────────────────────────────────────────────────────────────
  // API Calls
  // ─────────────────────────────────────────────────────────────
  async function fetchState() {
    const limit = getLimit();
    const url = `/api/state?limit=${encodeURIComponent(limit)}`;

    try {
      setStatus(true, "Chargement…", state.meta);

      const res = await fetch(url, {
        cache: "no-store",
        headers: { "Accept": "application/json" }
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();

      // Defensive parsing
      const assets = Array.isArray(json.assets) ? json.assets : [];
      state.raw = assets;

      state.meta = {
        updated: json.updated ?? null,
        source: json.source ?? "—"
      };

      // If assets empty but ok true, still render to show empty-state
      render();
      return json;
    } catch (err) {
      console.error("fetchState error:", err);
      state.raw = [];
      state.meta = state.meta || { updated: null, source: "—" };
      setStatus(false, "Erreur", state.meta);

      if (els.tableBody) {
        els.tableBody.innerHTML = `
          <tr>
            <td colspan="10" style="padding:16px;">
              Erreur de récupération des données.
            </td>
          </tr>
        `;
      }
      throw err;
    }
  }

  async function rebuildCache() {
    // Your backend endpoint may differ: /api/rebuild or /api/rebuild-cache
    // Try common ones:
    const candidates = ["/api/rebuild", "/api/rebuild-cache", "/api/rebuildCache"];
    let lastErr = null;

    for (const url of candidates) {
      try {
        setStatus(true, "Rebuild…", state.meta);
        const res = await fetch(url, { method: "POST" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        // after rebuild, refresh
        await fetchState();
        return;
      } catch (e) {
        lastErr = e;
      }
    }

    console.error("rebuildCache failed:", lastErr);
    setStatus(false, "Rebuild KO", state.meta);
  }

  // ─────────────────────────────────────────────────────────────
  // Auto refresh
  // ─────────────────────────────────────────────────────────────
  function stopAutoRefresh() {
    if (state.timer) {
      clearInterval(state.timer);
      state.timer = null;
    }
  }

  function startAutoRefresh() {
    stopAutoRefresh();

    const v = els.autoRefresh ? els.autoRefresh.value : "0";
    const seconds = safeNum(v, 0);

    if (!seconds || seconds <= 0) return;

    state.timer = setInterval(() => {
      fetchState().catch(() => {});
    }, seconds * 1000);
  }

  // ─────────────────────────────────────────────────────────────
  // Events
  // ─────────────────────────────────────────────────────────────
  function bindEvents() {
    if (els.btnRefresh) {
      els.btnRefresh.addEventListener("click", () => {
        fetchState().catch(() => {});
      });
    }

    if (els.btnRebuild) {
      els.btnRebuild.addEventListener("click", () => {
        rebuildCache().catch(() => {});
      });
    }

    // Control changes -> re-render locally (no refetch needed except limit if you want)
    const rerenderOnly = [els.signalPreset, els.sortBy, els.sortDir, els.hideStables]
      .filter(Boolean);

    for (const el of rerenderOnly) {
      el.addEventListener("change", () => {
        render();
      });
    }

    // Limit changes: fetch again (because backend can limit + it’s consistent)
    if (els.limit) {
      els.limit.addEventListener("change", () => {
        fetchState().catch(() => {});
      });
    }

    // Auto refresh changes
    if (els.autoRefresh) {
      els.autoRefresh.addEventListener("change", () => {
        startAutoRefresh();
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Init
  // ─────────────────────────────────────────────────────────────
  async function init() {
    bindEvents();

    // Initial status
    setStatus(true, "Prêt", state.meta);

    // First load + render
    try {
      await fetchState();
    } catch {
      // already handled in fetchState
    }

    // Start auto refresh if enabled
    startAutoRefresh();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
