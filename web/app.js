mport { loadAssets } from "./engine.js";

async function loadMarket(){

  const results =
  document.getElementById("results");

  results.innerHTML =
  "Chargement...";

  try{

    const assets =
    await loadAssets();

    assets.sort(
      (a,b)=>b.score-a.score
    );

    results.innerHTML =
    assets.slice(0,50)
    .map(a=>`

      <div class="row">

        <span>${a.symbol}</span>

        <span>${a.price} €</span>

        <span>${a.change24h.toFixed(2)}%</span>

        <span>${a.score}</span>

      </div>

    `)
    .join("");

  }
  catch(e){

    results.innerHTML =
    "Erreur chargement API";

    console.error(e);
  }
}

loadMarket();
