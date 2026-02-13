import { loadAssets } from "./engine.js";

let lastAssets = [];

function render(minScore) {
  const results = document.getElementById("results");
  if (!results) return;

  const filtered = lastAssets
    .filter(a => (a.score ?? 0) >= minScore)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 50);

  if (filtered.length === 0) {
    results.innerHTML = `<div style="opacity:.7;padding:10px">Aucun signal au-dessus de ${minScore}.</div>`;
    return;
  }

  results.innerHTML = `
    <div class="grid header">
      <div>Symbole</div><div>Prix</div><div>24h</div><div>Score</div>
    </div>
    ${filtered.map(a => `
      <div class="grid row">
        <div>${a.symbol ?? "-"}</div>
        <div>${formatPrice(a.price)}</div>
        <div class="${pctClass(a.change24h)}">${formatPct(a.change24h)}</div>
        <div>${a.score ?? 0}</div>
      </div>
    `).join("")}
  `;
}

async function loadMarket() {
  const results = document.getElementById("results");
  if (!results) return;

  results.textContent = "Chargement…";

  try {
    lastAssets = await loadAssets();

    const minScoreEl = document.getElementById("minScore");
    const minScore = minScoreEl ? Number(minScoreEl.value) : 75;

    render(minScore);
  } catch (e) {
    results.innerHTML = `<div class="error">Erreur API: ${escapeHtml(String(e?.message || e))}</div>`;
    console.error(e);
  }
}

function setupControls() {
  const minScoreEl = document.getElementById("minScore");
  const minScoreValue = document.getElementById("minScoreValue");

  if (minScoreEl && minScoreValue) {
    const sync = () => {
      const v = Number(minScoreEl.value);
      minScoreValue.textContent = String(v);
      render(v);
    };
    minScoreEl.addEventListener("input", sync);
    sync();
  }

  document.querySelectorAll("[data-preset]").forEach(btn => {
    btn.addEventListener("click", () => {
      const v = Number(btn.getAttribute("data-preset"));
      if (minScoreEl) minScoreEl.value = String(v);
      if (minScoreValue) minScoreValue.textContent = String(v);
      render(v);
    });
  });
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
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));
}

document.addEventListener("DOMContentLoaded", async () => {
  setupControls();
  await loadMarket();
});
