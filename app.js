// app.js
import { loadAssets } from "./engine.js";

const els = {
  results: document.getElementById("results"),
  preset: document.getElementById("preset"),
  refresh: document.getElementById("refresh"),
  btnRefresh: document.getElementById("btnRefresh"),
  advanced: document.getElementById("advanced"),
  minScore: document.getElementById("minScore"),
  maxScore: document.getElementById("maxScore"),
  sortBy: document.getElementById("sortBy"),
  limit: document.getElementById("limit"),
  hideStables: document.getElementById("hideStables"),
  status: document.getElementById("status"),
  updated: document.getElementById("updated"),
};

const STORAGE_KEY = "zilkara:v1:filters";

let state = {
  assets: [],
  lastFetchAt: 0,
  timer: null,
  inflight: false,

  // UI settings (defaults)
  presetMin: 0,
  refreshSec: 30,

  minScore: 0,
  maxScore: 100,
  sortBy: "score",
  limit: 50,
  hideStables: false,

  advancedOpen: false,
};

const STABLES = new Set([
  "USDT","USDC","DAI","TUSD","USDP","FDUSD","USDD","FRAX","EURC","USD1","USDE","PYUSD","LUSD","GUSD","USDS"
]);

function clampInt(v, min, max, fallback) {
  const n = Number.parseInt(String(v), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function nowLabel() {
  const d = new Date();
  return d.toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function setStatus(msg) {
  if (els.status) els.status.textContent = msg;
}

function setUpdated() {
  if (els.updated) els.updated.textContent = `MAJ: ${nowLabel()}`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

function formatPrice(v) {
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(v);
}

function formatPct(v) {
  if (!Number.isFinite(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function pctClass(v) {
  if (!Number.isFinite(v) || v === 0) return "";
  return v > 0 ? "pos" : "neg";
}

function getEffectiveMinScore() {
  // Important: au chargement, on veut min=0 sinon effet "ça marche pas".
  // Donc on initialise preset=0 + minScore=0.
  const presetMin = clampInt(state.presetMin, 0, 100, 0);
  const advMin = clampInt(state.minScore, 0, 100, 0);
  // Le filtre minimum doit être le max entre preset et avancé.
  return Math.max(presetMin, advMin);
}

function getEffectiveMaxScore() {
  return clampInt(state.maxScore, 0, 100, 100);
}

function normalizeRanges() {
  const min = getEffectiveMinScore();
  let max = getEffectiveMaxScore();
  if (max < min) max = min;
  state.maxScore = max;
  if (els.maxScore) els.maxScore.value = String(max);
}

function applyUIToState() {
  state.presetMin = clampInt(els.preset?.value ?? 0, 0, 100, 0);
  state.refreshSec = clampInt(els.refresh?.value ?? 30, 0, 3600, 30);

  state.minScore = clampInt(els.minScore?.value ?? 0, 0, 100, 0);
  state.maxScore = clampInt(els.maxScore?.value ?? 100, 0, 100, 100);

  state.sortBy = String(els.sortBy?.value ?? "score");
  state.limit = clampInt(els.limit?.value ?? 50, 1, 250, 50);
  state.hideStables = Boolean(els.hideStables?.checked);

  state.advancedOpen = Boolean(els.advanced?.open);
  normalizeRanges();
}

function applyStateToUI() {
  if (els.preset) els.preset.value = String(state.presetMin);
  if (els.refresh) els.refresh.value = String(state.refreshSec);

  if (els.minScore) els.minScore.value = String(state.minScore);
  if (els.maxScore) els.maxScore.value = String(state.maxScore);

  if (els.sortBy) els.sortBy.value = state.sortBy;
  if (els.limit) els.limit.value = String(state.limit);
  if (els.hideStables) els.hideStables.checked = state.hideStables;

  if (els.advanced) els.advanced.open = state.advancedOpen;
}

function saveState() {
  const payload = {
    presetMin: state.presetMin,
    refreshSec: state.refreshSec,
    minScore: state.minScore,
    maxScore: state.maxScore,
    sortBy: state.sortBy,
    limit: state.limit,
    hideStables: state.hideStables,
    advancedOpen: state.advancedOpen,
  };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch {}
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const p = JSON.parse(raw);

    state.presetMin = clampInt(p.presetMin ?? 0, 0, 100, 0);
    state.refreshSec = clampInt(p.refreshSec ?? 30, 0, 3600, 30);

    state.minScore = clampInt(p.minScore ?? 0, 0, 100, 0);
    state.maxScore = clampInt(p.maxScore ?? 100, 0, 100, 100);

    state.sortBy = String(p.sortBy ?? "score");
    state.limit = clampInt(p.limit ?? 50, 1, 250, 50);
    state.hideStables = Boolean(p.hideStables);

    state.advancedOpen = Boolean(p.advancedOpen);

    normalizeRanges();
  } catch {}
}

function sortAssets(arr) {
  const key = state.sortBy;

  const get = (a) => {
    if (key === "change24h") return Number(a.change24h) || 0;
    if (key === "marketCap") return Number(a.marketCap) || 0;
    if (key === "volume") return Number(a.volume) || 0;
    if (key === "price") return Number(a.price) || 0;
    return Number(a.score) || 0; // score
  };

  // Desc pour score/change/marketcap/volume, desc pour price aussi (plus haut en haut)
  return arr.sort((a, b) => get(b) - get(a));
}

function filterAssets() {
  const min = getEffectiveMinScore();
  const max = getEffectiveMaxScore();

  let out = state.assets.filter(a => {
    const s = Number(a.score) || 0;
    if (s < min || s > max) return false;
    if (state.hideStables && STABLES.has(String(a.symbol || "").toUpperCase())) return false;
    return true;
  });

  out = sortAssets(out);
  return out.slice(0, state.limit);
}

function render() {
  if (!els.results) return;

  const filtered = filterAssets();
  const min = getEffectiveMinScore();
  const max = getEffectiveMaxScore();

  // Header table
  let html = `
    <div class="table">
      <div class="thead">
        <div>Symbole</div>
        <div>Prix</div>
        <div>24h</div>
        <div>Score</div>
      </div>
  `;

  if (!filtered.length) {
    html += `
      <div class="empty">
        Aucun signal pour score entre <b>${min}</b> et <b>${max}</b>.
      </div>
    `;
  } else {
    html += filtered.map(a => `
      <div class="trow">
        <div class="sym">${escapeHtml(a.symbol ?? "—")}</div>
        <div class="price">${escapeHtml(formatPrice(Number(a.price)))}</div>
        <div class="chg ${pctClass(Number(a.change24h))}">${escapeHtml(formatPct(Number(a.change24h)))}</div>
        <div class="score">${escapeHtml(String(Number(a.score) || 0))}</div>
      </div>
    `).join("");
  }

  html += `</div>`;

  els.results.innerHTML = html;

  setStatus(
    `Filtre: min ${min} / max ${max} • Tri: ${state.sortBy} • Résultats: ${filtered.length}/${state.assets.length}`
  );
}

async function fetchMarket() {
  if (state.inflight) return;
  state.inflight = true;

  try {
    setStatus("Chargement marché…");
    const assets = await loadAssets();

    // Normalisation minimale (sécurité)
    state.assets = (assets || []).map(a => ({
      symbol: String(a.symbol || "").toUpperCase(),
      price: Number(a.price),
      change24h: Number(a.change24h),
      volume: Number(a.volume) || 0,
      marketCap: Number(a.marketCap) || 0,
      score: Number(a.score) || 0,
    }));

    state.lastFetchAt = Date.now();
    setUpdated();
    render();
  } catch (e) {
    console.error(e);
    if (els.results) {
      els.results.innerHTML = `<div class="error">Erreur API: ${escapeHtml(String(e?.message || e))}</div>`;
    }
    setStatus("Erreur API");
  } finally {
    state.inflight = false;
  }
}

function clearTimer() {
  if (state.timer) {
    clearInterval(state.timer);
    state.timer = null;
  }
}

function setupTimer() {
  clearTimer();
  const sec = clampInt(state.refreshSec, 0, 3600, 0);
  if (sec <= 0) return;
  state.timer = setInterval(fetchMarket, sec * 1000);
}

function wireEvents() {
  const onChange = () => {
    applyUIToState();
    saveState();
    setupTimer();
    render();
  };

  els.preset?.addEventListener("change", onChange);
  els.refresh?.addEventListener("change", onChange);

  els.minScore?.addEventListener("input", onChange);
  els.maxScore?.addEventListener("input", onChange);

  els.sortBy?.addEventListener("change", onChange);
  els.limit?.addEventListener("change", onChange);
  els.hideStables?.addEventListener("change", onChange);

  els.advanced?.addEventListener("toggle", onChange);

  els.btnRefresh?.addEventListener("click", () => {
    fetchMarket();
  });
}

function initDefaultsFirstLoad() {
  // Très important : éviter l'effet "ça marche pas".
  // Si pas de state stocké, on force un filtre à 0 et max 100.
  const hasStored = (() => {
    try { return Boolean(localStorage.getItem(STORAGE_KEY)); } catch { return false; }
  })();

  if (!hasStored) {
    state.presetMin = 0;
    state.minScore = 0;
    state.maxScore = 100;
    state.refreshSec = 30;
    state.sortBy = "score";
    state.limit = 50;
    state.hideStables = false;
    state.advancedOpen = false;
  }
}

function boot() {
  initDefaultsFirstLoad();
  loadState();
  applyStateToUI();
  wireEvents();

  // sync state from UI (et normaliser)
  applyUIToState();
  saveState();

  setupTimer();
  fetchMarket(); // first load
}

boot();
