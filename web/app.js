import { loadAssets } from "./engine.js";

async function loadMarket() {
  const results = document.getElementById("results");
  if (!results) return;

  results.innerHTML = `<div style="opacity:.7;padding:16px">Chargement…</div>`;

  try {
    const assets = await loadAssets();
    assets.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    results.innerHTML = assets.slice(0, 50).map(a => `
      <div class="row">
        <span>${a.symbol ?? "-"}</span>
        <span>${a.price ?? "-"}</span>
        <span>${(a.change24h ?? 0).toFixed(2)}%</span>
        <span>${a.score ?? "-"}</span>
      </div>
    `).join("");
  } catch (e) {
    results.innerHTML = `
      <div style="padding:16px;color:#ffb4b4">
        Erreur chargement API.<br/>
        ${String(e)}
      </div>
    `;
    console.error(e);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadMarket();
});
