import { loadAssets } from "./engine.js";

async function loadMarket() {
  const results = document.getElementById("results");

  if (!results) {
    document.body.innerHTML = "Erreur: #results introuvable";
    return;
  }

  results.textContent = "Chargement…";

  try {
    const assets = await loadAssets();
    assets.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    results.innerHTML = `
      <div class="grid header">
        <div>Symbole</div><div>Prix</div><div>24h</div><div>Score</div>
      </div>
      ${assets.slice(0, 50).map(a => `
        <div class="grid row">
          <div>${a.symbol}</div>
          <div>${formatPrice(a.price)}</div>
          <div class="${pctClass(a.change24h)}">${formatPct(a.change24h)}</div>
          <div>${a.score}</div>
        </div>
      `).join("")}
    `;
  } catch (e) {
    results.innerHTML = `<div class="error">Erreur API: ${escapeHtml(String(e?.message || e))}</div>`;
    console.error(e);
  }
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

loadMarket();
