import { loadAssets } from "./engine.js";

async function init() {

  const assets = await loadAssets();

  assets.sort((a, b) => b.score - a.score);

  const container = document.getElementById("results");

  container.innerHTML = assets
    .slice(0, 50)
    .map(a => `
      <div class="row">
        <span>${a.symbol}</span>
        <span>${a.price}</span>
        <span>${a.change24h.toFixed(2)}%</span>
        <span>${a.score}</span>
      </div>
    `)
    .join("");
}

document.addEventListener("DOMContentLoaded", init);
