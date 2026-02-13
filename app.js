// app.js (ESM)
import { loadAssets } from "./engine.js";

const REFRESH_MS = 60_000;

const els = {
  results: document.getElementById("results"),
  meta: document.getElementById("meta"),

  minScore: document.getElementById("minScore"),
  minScoreValue: document.getElementById("minScoreValue"),
  onlyPositive: document.getElementById("onlyPositive"),
  hideStables: document.getElementById("hideStables"),
};

let cache = [];
let timer = null;

const STABLE_SYMBOLS = new Set([
  "USDT","USDC","DAI","TUSD","FDUSD","USDE","USDP","BUSD","FRAX","PYUSD","USDD",
  "EURC","EURT","EURS"
]);

function isStableAsset(a) {
  const sym = String(a.symbol || "").toUpperCase();
  const name = String(a.name || "").toLowerCase();
  if (STABLE_SYMBOLS.has(sym)) return true;
  // heuristique légère, volontairement simple
  if (name.includes("usd") && (name.includes("stable") || name.includes("tether") || name.includes("coin"))) return true;
  return false;
}

function formatCurrencyEUR(v) {
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(v);
}

function formatPct(v) {
  if (!Number.isFinite(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function pctClass(v) {
  if (!Number.isFinite(v) || v === 0) return "muted";
  return v > 0 ? "pos" : "neg";
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

function marketRegime(list) {
  if (!list || list.length === 0) return "Unknown";
  const avg = list.reduce((acc, a) => acc + (Number(a.score) || 0), 0) / list.length;
  if (avg >= 70) return "Bullish";
  if (avg >= 55) return "Constructive";
  if (avg >= 40) return "Neutral";
  if (avg >= 25) return "Weak";
  return "Risk Off";
}

function readFilters() {
  const minScore = Number(els.minScore?.value ?? 0) || 0;
  const onlyPositive = !!els.onlyPositive?.checked;
  const hideStables = !!els.hideStables?.checked;
  return { minScore, onlyPositive, hideStables };
}

function setMeta(text) {
  if (els.meta) els.meta.textContent = text;
}

function render() {
  if (!els.results) return;

  const { minScore, onlyPositive, hideStables } = readFilters();

  const list = cache
    .filter(a => (Number(a.score) || 0) >= minScore)
    .filter(a => !onlyPositive || (Number(a.change24h) || 0) >= 0)
    .filter(a => !hideStables || !isStableAsset(a))
    .slice()
    .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));

  const reg = marketRegime(cache);
  const now = new Date();
  const time = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  setMeta(`Régime: ${reg} · Seuil: ${minScore} · Résultats: ${list.length} · Update: ${time}`);

  if (cache.length === 0) {
    els.results.innerHTML = `<div class="error">Aucune donnée. Réessaie.</div>`;
    return;
  }

  if (list.length === 0) {
    els.results.innerHTML = `<div class="empty">Aucun signal au-dessus de ${escapeHtml(String(minScore))}.</div>`;
    return;
  }

  const head = `
    <div class="grid header">
      <div>Symbole</div>
      <div>Prix</div>
      <div>24h</div>
      <div>Score</div>
    </div>
  `;

  const rows = list.slice(0, 80).map(a => {
    const sym = escapeHtml(String(a.symbol || "—").toUpperCase());
    const price = escapeHtml(formatCurrencyEUR(Number(a.price)));
    const chg = Number(a.change24h);
    const chgTxt = escapeHtml(formatPct(chg));
    const score = escapeHtml(String(Number(a.score) || 0));

    return `
      <div class="grid row">
        <div class="mono">${sym}</div>
        <div class="mono">${price}</div>
        <div class="mono ${pctClass(chg)}">${chgTxt}</div>
        <div class="mono score">${score}</div>
      </div>
    `;
  }).join("");

  els.results.innerHTML = head + rows;
}

async function refresh() {
  if (!els.results) return;

  els.results.textContent = "Chargement…";

  try {
    const data = await loadAssets();

    // Normalisation minimale
    cache = (data || []).map(a => ({
      symbol: a.symbol,
      name: a.name,
      price: Number(a.price),
      change24h: Number(a.change24h),
      score: Number(a.score) || 0,
      volume: Number(a.volume),
      marketCap: Number(a.marketCap),
    }));

    render();
  } catch (e) {
    console.error(e);
    els.results.innerHTML = `<div class="error">Erreur API: ${escapeHtml(String(e?.message || e))}</div>`;
    setMeta("Erreur API");
  }
}

function bindUI() {

  if (els.minScore && els.minScoreValue) {

    // FORCER la valeur par défaut à 0 au chargement
    els.minScore.value = "0";
    els.minScoreValue.textContent = "0";

    const sync = () => {
      const value = Number(els.minScore.value) || 0;
      els.minScoreValue.textContent = String(value);
      render();
    };

    els.minScore.addEventListener("input", sync);

    // appel initial
    sync();
  }

  document.querySelectorAll("[data-preset]").forEach(btn => {

    btn.addEventListener("click", () => {

      const value = btn.dataset.preset;

      els.minScore.value = value;
      els.minScoreValue.textContent = value;

      render();

    });

  });

}
  document.querySelectorAll("[data-preset]").forEach(btn => {
    btn.addEventListener("click", () => {
      const v = Number(btn.getAttribute("data-preset")) || 0;
      if (els.minScore) els.minScore.value = String(v);
      if (els.minScoreValue) els.minScoreValue.textContent = String(v);
      render();
    });
  });

  els.onlyPositive?.addEventListener("change", render);
  els.hideStables?.addEventListener("change", render);
}

function startAutoRefresh() {
  stopAutoRefresh();
  timer = setInterval(refresh, REFRESH_MS);
}

function stopAutoRefresh() {
  if (timer) clearInterval(timer);
  timer = null;
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopAutoRefresh();
  else {
    refresh();
    startAutoRefresh();
  }
});

bindUI();
refresh();
startAutoRefresh();
