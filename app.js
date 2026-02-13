import { loadAssets } from "./engine.js";

/**
 * Zilkara — Market Scanner (Front)
 * - preset filter (dropdown)
 * - advanced filters (min/max, sort, limit, hide stables)
 * - auto refresh
 * - table rendering (mobile readable)
 */

const els = {
  preset: document.getElementById("preset"),
  autoRefresh: document.getElementById("autoRefresh"),
  refreshBtn: document.getElementById("refreshBtn"),

  advanced: document.getElementById("advanced"),
  minSignal: document.getElementById("minSignal"),
  maxSignal: document.getElementById("maxSignal"),
  sortBy: document.getElementById("sortBy"),
  limit: document.getElementById("limit"),
  hideStables: document.getElementById("hideStables"),

  status: document.getElementById("status"),
  updated: document.getElementById("updated"),
  tbody: document.getElementById("tbody"),
};

const PRESETS = {
  all: { min: 0, max: 100 },
  large: { min: 40, max: 100 },
  standard: { min: 60, max: 100 },
  radar: { min: 75, max: 100 },
};

const state = {
  assets: [],
  timer: null,
  lastUpdateTs: 0,
};

init();

function init() {
  // IMPORTANT: filtre à 0 au chargement + auto-refresh off
  if (els.preset) els.preset.value = "all";
  if (els.autoRefresh) els.autoRefresh.value = "off";

  applyPresetToAdvanced("all");
  bindUI();
  refresh(); // premier rendu immédiat
}

function bindUI() {
  // Preset -> applique min/max + refresh
  els.preset?.addEventListener("change", () => {
    applyPresetToAdvanced(els.preset.value);
    refresh();
  });

  // Auto-refresh
  els.autoRefresh?.addEventListener("change", () => {
    setAutoRefresh(els.autoRefresh.value);
  });

  els.refreshBtn?.addEventListener("click", () => refresh());

  // Avancé: toute modif relance un render (sans re-fetch)
  // (et refetch si tu veux: tu peux remplacer renderOnly() par refresh())
  const onAdvancedChange = () => renderOnly();

  els.minSignal?.addEventListener("input", onAdvancedChange);
  els.maxSignal?.addEventListener("input", onAdvancedChange);
  els.sortBy?.addEventListener("change", onAdvancedChange);
  els.limit?.addEventListener("change", onAdvancedChange);
  els.hideStables?.addEventListener("change", onAdvancedChange);
}

function applyPresetToAdvanced(presetKey) {
  const p = PRESETS[presetKey] ?? PRESETS.all;
  if (els.minSignal) els.minSignal.value = String(p.min);
  if (els.maxSignal) els.maxSignal.value = String(p.max);
}

function setAutoRefresh(value) {
  clearInterval(state.timer);
  state.timer = null;

  if (!value || value === "off") {
    setStatus("Auto-refresh: OFF");
    return;
  }

  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    setStatus("Auto-refresh: OFF");
    return;
  }

  setStatus(`Auto-refresh: ${seconds}s`);
  state.timer = setInterval(() => {
    refresh();
  }, seconds * 1000);
}

async function refresh() {
  setStatus("Chargement…");

  try {
    const data = await loadAssets();

    // Normalisation des champs attendus (robuste)
    state.assets = (Array.isArray(data) ? data : []).map(a => normalizeAsset(a));
    state.lastUpdateTs = Date.now();

    renderOnly();
  } catch (e) {
    console.error(e);
    setStatus(`Erreur API: ${safeText(e?.message ?? String(e))}`);
    if (els.tbody) els.tbody.innerHTML = "";
  }
}

function renderOnly() {
  const raw = state.assets || [];
  const filtered = applyFilters(raw);
  renderTable(filtered);

  const total = raw.length;
  const shown = filtered.length;
  const t = state.lastUpdateTs ? formatTime(state.lastUpdateTs) : "--:--:--";

  const min = clampInt(Number(els.minSignal?.value ?? 0), 0, 100);
  const max = clampInt(Number(els.maxSignal?.value ?? 100), 0, 100);
  const sortBy = els.sortBy?.value ?? "signal";

  setMeta(
    `Filtre: min ${min} / max ${max} • Tri: ${sortBy} • Résultats: ${shown}/${total}`,
    `MAJ: ${t}`
  );
}

function applyFilters(list) {
  const min = clampInt(Number(els.minSignal?.value ?? 0), 0, 100);
  const max = clampInt(Number(els.maxSignal?.value ?? 100), 0, 100);
  const limit = clampInt(Number(els.limit?.value ?? 50), 1, 250);
  const sortBy = els.sortBy?.value ?? "signal";
  const hideStables = Boolean(els.hideStables?.checked);

  let out = list
    .filter(a => a.signal >= min && a.signal <= max);

  if (hideStables) {
    out = out.filter(a => !isStablecoin(a.symbol, a.name));
  }

  out.sort((a, b) => compareBy(sortBy, a, b));

  return out.slice(0, limit);
}

function renderTable(rows) {
  if (!els.tbody) return;

  els.tbody.innerHTML = rows.map(a => {
    const changeClass = a.change24h >= 0 ? "pos" : "neg";
    const changeText = (a.change24h >= 0 ? "+" : "") + a.change24h.toFixed(2) + "%";

    return `
      <tr>
        <td class="sym">${escapeHtml(a.symbol)}</td>
        <td class="num">${formatEUR(a.price)}</td>
        <td class="${changeClass}">${escapeHtml(changeText)}</td>
        <td class="sig">${escapeHtml(String(a.signal))}</td>
      </tr>
    `;
  }).join("");
}

/* ---------------------------
   Helpers
--------------------------- */

function normalizeAsset(a) {
  const symbol = String(a?.symbol ?? "").toUpperCase().trim();
  const name = String(a?.name ?? "").trim();

  // prix
  const price = num(a?.price ?? a?.current_price ?? 0);

  // variation 24h
  const change24h = num(
    a?.change24h ??
    a?.price_change_percentage_24h ??
    a?.price_change_pct_24h ??
    0
  );

  // signal (score renommé)
  const signal = clampInt(
    Number(a?.signal ?? a?.score ?? 0),
    0,
    100
  );

  // données utiles pour tri avancé
  const marketCap = num(a?.marketCap ?? a?.market_cap ?? 0);
  const volume = num(a?.volume ?? a?.total_volume ?? 0);

  return { symbol, name, price, change24h, signal, marketCap, volume };
}

function compareBy(key, a, b) {
  switch (key) {
    case "signal":
      return b.signal - a.signal;

    case "change24h":
      return b.change24h - a.change24h;

    case "marketCap":
      return b.marketCap - a.marketCap;

    case "volume":
      return b.volume - a.volume;

    case "price":
      return b.price - a.price;

    case "symbol":
      return a.symbol.localeCompare(b.symbol);

    default:
      return b.signal - a.signal;
  }
}

function isStablecoin(symbol, name) {
  const s = String(symbol || "").toUpperCase();
  const n = String(name || "").toUpperCaseCaseSafe();

  const stableSymbols = new Set([
    "USDT","USDC","DAI","TUSD","FDUSD","USDE","USDP","BUSD","FRAX","PYUSD","USDD"
  ]);

  if (stableSymbols.has(s)) return true;

  // heuristique simple
  if (s.includes("USD")) return true;
  if (n.includes("USD") && (n.includes("STABLE") || n.includes("TETHER") || n.includes("COIN"))) return true;

  return false;
}

function formatEUR(v) {
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(v);
}

function formatTime(ts) {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function setStatus(text) {
  if (!els.status) return;
  els.status.textContent = text;
}

function setMeta(left, right) {
  if (els.status) els.status.textContent = left;
  if (els.updated) els.updated.textContent = right;
}

function clampInt(v, min, max) {
  const n = Math.trunc(Number.isFinite(v) ? v : min);
  return Math.max(min, Math.min(max, n));
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeText(s) {
  return String(s).slice(0, 200);
}

function StringToUpperSafe(x) {
  return String(x ?? "").toUpperCase();
}

// petite util interne (évite crash si name undefined)
String.prototype.toUpperCaseSafe = function () {
  return String(this ?? "").toUpperCase();
};
