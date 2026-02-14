(() => {
  const $ = (id) => document.getElementById(id);

  // ---- Binance affiliation
  const BINANCE_REF = "1216069378";
  const BINANCE_JOIN_URL =
    `https://www.binance.com/fr/register?ref=${encodeURIComponent(BINANCE_REF)}`;
  const BINANCE_TRADE_BASE = "https://www.binance.com/fr/trade/";

  // ---- UI refs (must match index.html)
  const els = {
    statusText: $("statusText"),
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
    stableMode: $("hideStables") || $("stableMode"), // depending on your HTML

    tableBody: $("tableBody"),

    binanceJoinTop: $("binanceJoinTop"),
    binanceJoinBottom: $("binanceJoinBottom"),
  };

  // ---- set affiliate links if present
  if (els.binanceJoinTop) els.binanceJoinTop.href = BINANCE_JOIN_URL;
  if (els.binanceJoinBottom) els.binanceJoinBottom.href = BINANCE_JOIN_URL;

  // ---- formatters
  const fmtEUR = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  });

  const fmtPct = new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
  });

  const STABLES = new Set([
    "USDT","USDC","DAI","TUSD","FDUSD","USDP","USDD","FRAX","LUSD",
    "EURC","EURS","USDE","USDS"
  ]);

  const state = {
    timer: null,
    last: null,
  };

  function setStatus(ok, text, meta = {}) {
    if (els.statusText) els.statusText.textContent = text;

    if (els.source) {
      els.source.textContent = meta.source ?? "—";
    }

    if (els.updated) {
      if (meta.updated) {
        els.updated.textContent = new Date(meta.updated).toLocaleTimeString("fr-FR");
      } else {
        els.updated.textContent = "—";
      }
    }

    if (els.dot) {
      if (ok) {
        els.dot.style.background = "rgba(56,209,122,1)";
        els.dot.style.boxShadow = "0 0 6px rgba(56,209,122,.4)";
      } else {
        els.dot.style.background = "rgba(255,90,90,1)";
        els.dot.style.boxShadow = "0 0 6px rgba(255,90,90,.35)";
      }
    }
  }

  function safeNum(x, fallback = 0) {
    const n = Number(x);
    return Number.isFinite(n) ? n : fallback;
  }

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function pctClass(v) {
    if (v > 0) return "positive";
    if (v < 0) return "negative";
    return "";
  }

  function regimeBadge(regime) {
    const r = String(regime || "").toUpperCase();
    let cls = "badge";
    if (r === "STABLE") cls += " badgeGood";
    else if (r === "TRANSITION") cls += " badgeWarn";
    else if (r === "CHAOTIC") cls += " badgeBad";
    return `<span class="${cls}">${esc(r || "—")}</span>`;
  }

  function ratingBadge(rating) {
    const r = String(rating || "").toUpperCase();
    let cls = "badge";
    if (r === "A") cls += " badgeGood";
    else if (r === "B") cls += " badgeWarn";
    else if (r === "C" || r === "D") cls += " badgeBad";
    return `<span class="${cls}">${esc(r || "—")}</span>`;
  }

  function binanceTradeLink(symbol) {
    // Binance spot trade uses BASE_QUOTE, default USDT
    const pair = `${String(symbol).toUpperCase()}_USDT`;
    return `${BINANCE_TRADE_BASE}${pair}`;
  }

  function readControls() {
    const limit = els.limit ? Number(els.limit.value) : 50;
    const sortBy = els.sortBy ? els.sortBy.value : "stability_score";
    const sortDir = els.sortDir ? els.sortDir.value : "desc";
    const preset = els.signalPreset ? els.signalPreset.value : "large";
    const auto = els.autoRefresh ? Number(els.autoRefresh.value) : 0;

    const hideStables = !!(els.stableMode && els.stableMode.checked);

    // preset -> min stability score
    let minStability = 0;
    if (preset === "large") minStability = 40;
    if (preset === "strict") minStability = 60;
    if (preset === "all") minStability = 0;

    return { limit, sortBy, sortDir, minStability, auto, hideStables };
  }

  function sortAssets(arr, sortBy, sortDir) {
    const dir = (sortDir === "asc") ? 1 : -1;

    const key = (a) => {
      if (sortBy === "name") return String(a.name || "");
      if (sortBy === "symbol") return String(a.symbol || "");
      return safeNum(a[sortBy], 0);
    };

    arr.sort((a, b) => {
      const ka = key(a);
      const kb = key(b);
      if (typeof ka === "string" || typeof kb === "string") {
        return dir * String(ka).localeCompare(String(kb), "fr", { sensitivity: "base" });
      }
      return dir * (ka - kb);
    });

    return arr;
  }

  function render(assets) {
    if (!els.tableBody) return;

    const rows = assets.map((a) => {
      const symbol = String(a.symbol || "").toUpperCase();
      const name = String(a.name || "");
      const price = safeNum(a.price, 0);

      const ch24 = safeNum(a.chg_24h_pct, 0);
      const ch7 = safeNum(a.chg_7d_pct, 0);
      const ch30 = safeNum(a.chg_30d_pct, 0);

      const stability = safeNum(a.stability_score, 0);
      const similarity = safeNum(a.similarity, 0);
      const rupture = safeNum(a.rupture_rate, 0);

      const reason = String(a.reason || "");

      return `
        <tr>
          <td class="col-asset">
            <div class="assetMain">
              <div class="assetSymbol">${esc(symbol)}</div>
              <div class="assetName">${esc(name)}</div>
            </div>
          </td>

          <td class="col-num">${fmtEUR.format(price)}</td>

          <td class="col-num ${pctClass(ch24)}">${fmtPct.format(ch24)}%</td>
          <td class="col-num ${pctClass(ch7)}">${fmtPct.format(ch7)}%</td>
          <td class="col-num ${pctClass(ch30)}">${fmtPct.format(ch30)}%</td>

          <td class="col-num"><strong>${esc(stability)}</strong></td>
          <td class="col-num">${ratingBadge(a.rating)}</td>
          <td class="col-num">${regimeBadge(a.regime)}</td>

          <td class="col-num">${esc(similarity)}%</td>
          <td class="col-num">${esc(rupture)}</td>

          <td class="col-action">
            <a class="tradeBtn" href="${esc(binanceTradeLink(symbol))}" target="_blank" rel="noopener">
              Binance
            </a>
          </td>

          <td class="col-reason">${esc(reason)}</td>
        </tr>
      `;
    });

    els.tableBody.innerHTML = rows.join("");
  }

  async function fetchState() {
    const { limit, minStability, hideStables } = readControls();

    const url = new URL("/api/state", window.location.origin);
    url.searchParams.set("limit", String(limit));

    setStatus(true, "Chargement…", { source: "—", updated: null });

    const res = await fetch(url.toString(), { cache: "no-store" });
    const json = await res.json();

    if (!json || !json.ok) {
      setStatus(false, "Erreur API", { source: "—", updated: null });
      return;
    }

    let assets = Array.isArray(json.assets) ? json.assets.slice() : [];

    // filter stables
    if (hideStables) {
      assets = assets.filter((a) => !STABLES.has(String(a.symbol || "").toUpperCase()));
    }

    // filter min stability (preset)
    assets = assets.filter((a) => safeNum(a.stability_score, 0) >= minStability);

    // sort
    const { sortBy, sortDir } = readControls();
    sortAssets(assets, sortBy, sortDir);

    // render
    render(assets);

    // status
    setStatus(true, "OK", { source: json.source ?? "—", updated: json.updated ?? null });

    state.last = json;
  }

  function startAutoRefresh() {
    if (state.timer) clearInterval(state.timer);
    state.timer = null;

    const { auto } = readControls();
    if (!auto || auto <= 0) return;

    state.timer = setInterval(() => {
      fetchState().catch((e) => {
        console.error(e);
        setStatus(false, "Erreur JS", { source: "—", updated: null });
      });
    }, auto * 1000);
  }

  async function rebuildCache() {
    try {
      setStatus(true, "Rebuild…", { source: "—", updated: null });
      // tokenless rebuild (if your endpoint needs a token, it will fail -> you’ll see it)
      const res = await fetch("/api/rebuild", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!json || !json.ok) {
        setStatus(false, "Rebuild failed", { source: "—", updated: null });
        return;
      }
      setStatus(true, "Rebuild OK", { source: "rebuild", updated: Date.now() });
      await fetchState();
    } catch (e) {
      console.error(e);
      setStatus(false, "Erreur rebuild", { source: "—", updated: null });
    }
  }

  function bind() {
    if (els.btnRefresh) els.btnRefresh.addEventListener("click", () => fetchState().catch(console.error));
    if (els.btnRebuild) els.btnRebuild.addEventListener("click", () => rebuildCache());

    const controls = [
      els.signalPreset,
      els.autoRefresh,
      els.sortBy,
      els.sortDir,
      els.limit,
      els.stableMode,
    ].filter(Boolean);

    controls.forEach((el) => {
      el.addEventListener("change", () => {
        fetchState().catch(console.error);
        startAutoRefresh();
      });
    });
  }

  // ---- boot
  try {
    bind();
    fetchState().catch((e) => {
      console.error(e);
      setStatus(false, "Erreur JS", { source: "—", updated: null });
    });
    startAutoRefresh();
  } catch (e) {
    console.error(e);
    setStatus(false, "Crash JS", { source: "—", updated: null });
  }
})();
