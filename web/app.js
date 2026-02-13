import { loadAssets } from "./engine.js";

document.body.insertAdjacentHTML("afterbegin", "<div style='color:lime'>JS OK</div>");
async function loadMarket(){

    const results =
    document.getElementById("results");

    if(!results){
        document.body.innerHTML =
        "Erreur : results container manquant";
        return;
    }

    results.innerHTML = "Chargement...";

    try{

        const assets =
        await loadAssets();

        assets.sort(
            (a,b)=>b.score-a.score
        );

        results.innerHTML =
        assets.slice(0,50)
        .map(a=>`

        <div style="padding:6px 0;border-bottom:1px solid #333">

            <span>${a.symbol}</span>
            —
            <span>${a.price} €</span>
            —
            <span>${a.change24h.toFixed(2)}%</span>
            —
            <span>${a.score}</span>

        </div>

        `)
        .join("");

    }
    catch(e){

        results.innerHTML =
        "Erreur API : " + e.message;

        console.error(e);

    }

}

loadMarket();
