// web/app.js
import { loadAssets } from "./engine.js";

async function loadMarket() {
  const results = document.getElementById("results");
  if (!results) return;

  results.textContent = "Chargement...";

  try {
    const assets = await loadAssets({ vs: "eur" });
    assets.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    results.innerHTML = assets
      .slice(0, 50)
      .map(
        (a) => `
        <div class="row">
          <span>${a.symbol ?? "-"}</span>
          <span>${formatPrice(a.price)} €</span>
          <span>${formatPct(a.chg24)}%</span>
          <span>${a.score ?? "-"}</span>
        </div>`
      )
      .join("");
  } catch (e) {
    results.innerHTML = `
      <div style="padding:16px;color:#ff6b6b">
        Erreur chargement API<br/>
        ${escapeHtml(String(e))}
      </div>`;
    console.error(e);
  }
}

function formatPrice(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "-";
  return v < 1 ? v.toFixed(6) : v.toFixed(2);
}

function formatPct(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0.00";
  return v.toFixed(2);
}

function escapeHtml(s) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

document.addEventListener("DOMContentLoaded", loadMarket);
