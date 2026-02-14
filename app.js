(() => {
  const $ = (id) => document.getElementById(id);

  // ---- Binance affiliation
  // Ref ID fourni : 1216069378
  const BINANCE_REF = "1216069378";
  const BINANCE_JOIN_URL = `https://www.binance.com/fr/register?ref=${encodeURIComponent(BINANCE_REF)}`;
  const BINANCE_TRADE_BASE = "https://www.binance.com/fr/trade/";

  // ---- stablecoins to optionally hide / avoid trade button
  const STABLES = new Set([
    "USDT","USDC","DAI","TUSD","FDUSD","USDP","USDD","FRAX","LUSD","EURC","EURS","USDE","USDS"
  ]);

  // ---- UI refs (must match index.html)
  const els = {
    statusText: $("statusText"),
    statusNote: $("statusNote"),
    updated: $("updated"),
    source: $("source"),
    dot: $("dot"),

    btnRefresh: $("btnRefresh"),
    btnRebuild: $("btnRebuild"),

    signalPreset: $("signalPreset"),
    autoRefresh: $("autoRefresh"),
    sortBy: $("sortBy"),
    sortDir: $("sortDir"),
    limit: $("limit"),
    stableMode: $("stableMode"),

    rebuildToken: $("rebuildToken"),

    tableBody: $("tableBody"),

    binanceJoinTop: $("binanceJoinTop"),
    binanceJoinBottom: $("binanceJoinBottom")
  };

  // set affiliate links if present
  if (els.binanceJoinTop) els.binanceJoinTop.href = BINANCE_JOIN_URL;
  if (els.binanceJoinBottom) els.binanceJoinBottom.href = BINANCE_JOIN_URL;

  // ---- formatters
  const fmtEUR = new Intl.NumberFormat("fr-FR", { style:"currency", currency:"EUR", maximumFractionDigits: 2 });
  const fmtPct = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

  // ---- state
  const state = {
    raw: [],
    timer: null,
    meta: { updated: null, source: "—" }
  };

  function setDot(ok, mode = "idle") {
    // mode: idle | loading | ok | bad
    if (!els.dot) return;
    if (mode === "loading") {
      els.dot.style.background = "var(--warn)";
      els.dot.style.boxShadow = "0 0 0 4px rgba(255,204,102,.12)";
      return;
    }
    if (mode === "bad") {
      els.dot.style.background = "var(--bad)";
      els.dot.style.boxShadow = "0 0 0 4px rgba(255,90,90,.12)";
      return;
    }
    if (ok) {
      els.dot.style.background = "var(--good)";
      els.dot.style.boxShadow = "0 0 0 4px rgba(56,209,122,.12)";
    } else {
      els.dot.style.background = "rgba(255,255,255,.35)";
      els.dot.style.boxShadow = "0 0 0 4px rgba(255,255,255,.06)";
    }
  }

  function setStatus(ok, text, meta, note = "") {
    if (els.statusText) els.statusText.textContent = text || (ok ? "OK" : "Erreur");
    if (els.statusNote) els.statusNote.textContent = note || "";
    if (els.source) els.source.textContent = (meta && meta.source) ? meta.source : "—";
    if (els.updated) {
      if (meta && meta.updated) {
        els.updated.textContent = new Date(meta.updated).toLocaleTimeString("fr-FR");
      } else {
        els.updated.textContent = "—";
      }
    }
    setDot(!!ok, ok ? "ok" : "bad");
  }

  function safeNum(x, fallback = 0) {
    const n = Number(x);
    return Number.isFinite(n) ? n : fallback;
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getRebuildToken() {
    // localStorage as single source of truth
    const v = (els.rebuildToken?.value || "").trim();
    if (v) {
      localStorage.setItem("zilkara_rebuild_token", v);
      return v;
    }
    return (localStorage.getItem("zilkara_rebuild_token") || "").trim();
  }

  function initTokenField() {
    if (!els.rebuildToken) return;
    const saved = (localStorage.getItem("zilkara_rebuild_token") || "").trim();
    if (saved) els.rebuildToken.value = saved;
  }

  function getPrefs() {
    const signalMin = safeNum(els.signalPreset?.value, 0);
    const limit = safeNum(els.limit?.value, 50);
    const sortBy = (els.sortBy?.value || "stability_score");
    const sortDir = (els.sortDir?.value || "desc");
    const stableMode = (els.stableMode?.value || "hide");
    return { signalMin, limit, sortBy, sortDir, stableMode };
  }

  function buildTradeUrl(symbol) {
    // Binance spot URL pattern: /trade/SYMBOL_USDT (simple)
    const sym = String(symbol || "").toUpperCase();
    if (!sym || STABLES.has(sym)) return null;

    // Prefer USDT quote for most assets
    const pair = `${sym}_USDT`;
    return `${BINANCE_TRADE_BASE}${encodeURIComponent(pair)}`;
  }

  function computeSignal(a) {
    // If backend already provides signal, use it; else derive a proxy using multi-horizon momentum + stability.
    if (Number.isFinite(Number(a.signal))) return safeNum(a.signal, 0);

    const s = safeNum(a.stability_score, 0);
    const p24 = safeNum(a.chg_24h_pct, 0);
    const p7 = safeNum(a.chg_7d_pct, 0);
    const p30 = safeNum(a.chg_30d_pct, 0);

    // proxy: stability weights + momentum (clamped)
    const mom = Math.max(-20, Math.min(20, (p24 * 0.45) + (p7 * 0.35) + (p30 * 0.20)));
    const base = (s * 0.75) + ((mom + 20) * 1.25); // mom -> 0..50, stability -> 0..75
    return Math.max(0, Math.min(100, Math.round(base)));
  }

  function sortAssets(list, sortBy, sortDir) {
    const dir = (sortDir === "asc") ? 1 : -1;
    const key = sortBy;

    const get = (o) => {
      if (key === "name") return String(o.name || "");
      if (key === "signal") return computeSignal(o);
      return safeNum(o[key], -1e18);
    };

    return [...list].sort((a, b) => {
      const va = get(a);
      const vb = get(b);

      if (typeof va === "string" || typeof vb === "string") {
        return dir * String(va).localeCompare(String(vb), "fr", { sensitivity:"base" });
      }
      if (va === vb) return 0;
      return dir * (va > vb ? 1 : -1);
    });
  }

  function filterAssets(raw, prefs) {
    const { signalMin, stableMode } = prefs;

    let list = raw.map(x => ({ ...x, signal: computeSignal(x) }));

    if (stableMode === "hide") {
      list = list.filter(a => !STABLES.has(String(a.symbol || "").toUpperCase()));
    }

    if (signalMin > 0) {
      list = list.filter(a => safeNum(a.signal, 0) >= signalMin);
    }

    return list;
  }

  function pctClass(v) {
    const n = safeNum(v, 0);
    return n >= 0 ? "pct pos" : "pct neg";
  }

  function renderTable(raw) {
    const prefs = getPrefs();
    let list = filterAssets(raw, prefs);
    list = sortAssets(list, prefs.sortBy, prefs.sortDir);
    list = list.slice(0, prefs.limit);

    const rows = list.map(a => {
      const sym = escapeHtml((a.symbol || "").toUpperCase());
      const name = escapeHtml(a.name || "");
      const price = safeNum(a.price, 0);
      const p24 = safeNum(a.chg_24h_pct, 0);
      const p7 = safeNum(a.chg_7d_pct, 0);
      const p30 = safeNum(a.chg_30d_pct, 0);

      const stability = Math.round(safeNum(a.stability_score, 0));
      const rating = escapeHtml(a.rating || "—");
      const regime = String(a.regime || "—").toUpperCase();
      const rupture = safeNum(a.rupture_rate, 0);
      const similarity = safeNum(a.similarity, 0);
      const reason = escapeHtml(a.reason || "");

      const tradeUrl = buildTradeUrl(sym);
      const tradeBtn = tradeUrl
        ? `<a class="badge" href="${tradeUrl}" target="_blank" rel="nofollow noopener">Trader</a>`
        : `<span class="badge" style="opacity:.45">—</span>`;

      const regimeClass = (regime === "STABLE" || regime === "TRANSITION" || regime === "CHAOTIC") ? regime : "";

      return `
        <tr>
          <td>
            <div class="sym">${sym}</div>
            <div class="name">${name}</div>
          </td>

          <td class="num">${fmtEUR.format(price)}</td>
          <td class="num ${pctClass(p24)}">${fmtPct.format(p24)} %</td>
          <td class="num ${pctClass(p7)}">${fmtPct.format(p7)} %</td>
          <td class="num ${pctClass(p30)}">${fmtPct.format(p30)} %</td>

          <td class="num"><span class="badge">${stability}</span></td>
          <td class="num"><span class="badge">${rating}</span></td>
          <td class="num"><span class="reg ${regimeClass}">${escapeHtml(regime)}</span></td>
          <td class="num">${fmtPct.format(rupture)}</td>
          <td class="num">${fmtPct.format(similarity)} %</td>
          <td class="reason" title="${reason}">${reason}</td>

          <td>${tradeBtn}</td>
        </tr>
      `;
    }).join("");

    els.tableBody.innerHTML = rows || `<tr><td colspan="12" style="padding:18px;color:rgba(255,255,255,.55)">Aucune donnée.</td></tr>`;
  }

  async function fetchState() {
    setDot(true, "loading");
    setStatus(true, "Chargement…", state.meta, "Lecture de /api/state (KV).");

    const prefs = getPrefs();
    const url = `/api/state?limit=${encodeURIComponent(prefs.limit)}&_=${Date.now()}`;

    let json;
    try {
      const res = await fetch(url, { cache: "no-store" });
      json = await res.json();
    } catch (e) {
      setStatus(false, "Erreur", state.meta, "Échec réseau vers /api/state.");
      return;
    }

    if (!json || json.ok !== true) {
      const err = json?.error ? String(json.error) : "Réponse invalide";
      setStatus(false, "Erreur", state.meta, err);
      return;
    }

    state.raw = Array.isArray(json.assets) ? json.assets : [];
    state.meta = { updated: json.updated ?? null, source: json.source ?? "—" };

    renderTable(state.raw);
    setStatus(true, "OK", state.meta, "");
  }

  async function rebuildCache() {
    const token = getRebuildToken();
    if (!token) {
      setStatus(false, "Erreur", state.meta, "Token rebuild absent (Avancé).");
      return;
    }

    setDot(true, "loading");
    setStatus(true, "Rebuild…", state.meta, "Exécution /api/rebuild (KV write).");

    const prefs = getPrefs();

    // token en header (meilleur) + query (fallback)
    const url = `/api/rebuild?limit=${encodeURIComponent(prefs.limit)}&token=${encodeURIComponent(token)}&_=${Date.now()}`;

    let json;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "x-zilkara-token": token
        },
        cache: "no-store"
      });
      json = await res.json();
    } catch (e) {
      setStatus(false, "Erreur", state.meta, "Échec réseau vers /api/rebuild.");
      return;
    }

    if (!json || json.ok !== true) {
      const err = json?.error ? String(json.error) : "Rebuild échoué";
      setStatus(false, "Erreur", state.meta, err);
      return;
    }

    // Re-read state after rebuild
    await fetchState();
  }

  function applyAutoRefresh() {
    const sec = safeNum(els.autoRefresh?.value, 0);
    if (state.timer) clearInterval(state.timer);
    state.timer = null;

    if (sec > 0) {
      state.timer = setInterval(fetchState, sec * 1000);
    }
  }

  function bind() {
    els.btnRefresh?.addEventListener("click", fetchState);
    els.btnRebuild?.addEventListener("click", rebuildCache);

    const onChange = () => {
      applyAutoRefresh();
      renderTable(state.raw);
    };

    els.signalPreset?.addEventListener("change", onChange);
    els.autoRefresh?.addEventListener("change", onChange);
    els.sortBy?.addEventListener("change", onChange);
    els.sortDir?.addEventListener("change", onChange);
    els.limit?.addEventListener("change", onChange);
    els.stableMode?.addEventListener("change", onChange);

    els.rebuildToken?.addEventListener("change", () => getRebuildToken());
  }

  // init
  initTokenField();
  bind();
  applyAutoRefresh();
  fetchState();
})();
