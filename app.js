(() => {

const $ = (id) => document.getElementById(id);

const BINANCE_REF = "1216069378";
const BINANCE_URL =
`https://www.binance.com/fr/register?ref=${BINANCE_REF}`;

const tableBody = $("tableBody");

const fmtEUR = new Intl.NumberFormat("fr-FR", {
 style: "currency",
 currency: "EUR",
 maximumFractionDigits: 0
});

const fmtPct = new Intl.NumberFormat("fr-FR", {
 maximumFractionDigits: 2
});

function regimeClass(regime){

 if(regime === "STABLE") return "good";
 if(regime === "TRANSITION") return "warn";
 if(regime === "CHAOTIC") return "bad";

 return "";

}

function createRow(asset){

 const tr = document.createElement("tr");

 tr.innerHTML = `

<td>${asset.symbol}</td>

<td>${fmtEUR.format(asset.price)}</td>

<td class="${asset.chg_24h_pct >= 0 ? "good" : "bad"}">
${fmtPct.format(asset.chg_24h_pct)}%
</td>

<td>${asset.stability_score}</td>

<td>${asset.rating}</td>

<td class="${regimeClass(asset.regime)}">
${asset.regime}
</td>

<td>${asset.similarity}%</td>

<td>${asset.rupture_rate}</td>

<td>
<a href="${BINANCE_URL}" target="_blank">
Trade
</a>
</td>

`;

 return tr;

}

async function load(){

 try{

 const res = await fetch("/api/state?limit=50");

 const json = await res.json();

 if(!json.ok) return;

 tableBody.innerHTML = "";

 json.assets
 .sort((a,b)=> b.stability_score - a.stability_score)
 .forEach(asset=>{

 tableBody.appendChild(createRow(asset));

 });

 }catch(e){

 console.error(e);

 }

}

load();

})();
