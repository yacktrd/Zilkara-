function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

function pctChanges(series){
  const out = [];
  for(let i=1;i<series.length;i++){
    const prev = series[i-1];
    const cur = series[i];
    if(prev === 0) continue;
    out.push((cur - prev) / prev);
  }
  return out;
}

function mean(arr){
  if(!arr.length) return 0;
  return arr.reduce((a,b)=>a+b,0) / arr.length;
}

function stdev(arr){
  if(arr.length < 2) return 0;
  const m = mean(arr);
  const v = mean(arr.map(x => (x - m) * (x - m)));
  return Math.sqrt(v);
}

function trendLabel(series){
  if(series.length < 2) return "Sideways";
  const first = series[0];
  const last  = series[series.length - 1];
  const pct = (last - first) / first;
  if(pct > 0.03) return "Uptrend";
  if(pct < -0.03) return "Downtrend";
  return "Sideways";
}

/**
 * V1 (30 jours, closes journaliers)
 * - Volatility: basé sur l'écart-type des variations journalières
 * - Coherence: basé sur la proportion de jours dans le même sens que le trend global
 * - Breaks: nombre de variations "anormales" (>|2*sigma|)
 */
function computeStability(close30){
  const rets = pctChanges(close30);
  if(rets.length < 10){
    return {stability: 50, rating:"C", market_state:"Transition", trend:"Sideways", breaks:0};
  }

  const sigma = stdev(rets);                // volatilité
  const absMean = mean(rets.map(x => Math.abs(x)));

  // 1) Volatility score (plus sigma est faible -> score élevé)
  // calibration simple: sigma 0.01 (~1%/jour) = stable, sigma 0.05 = très volatile
  const volNorm = clamp((0.05 - sigma) / (0.05 - 0.01), 0, 1);
  const volScore = 100 * volNorm;

  // 2) Trend + coherence score
  const tr = trendLabel(close30);
  const trendSign = tr === "Uptrend" ? 1 : tr === "Downtrend" ? -1 : 0;
  let coherence = 0.5; // défaut
  if(trendSign !== 0){
    const sameDir = rets.filter(r => (r * trendSign) > 0).length;
    coherence = sameDir / rets.length; // 0..1
  } else {
    // sideways: cohérence = faible amplitude moyenne
    coherence = clamp((0.02 - absMean) / 0.02, 0, 1);
  }
  const cohScore = 100 * clamp(coherence, 0, 1);

  // 3) Breaks score
  const thresh = 2 * sigma;
  const breaks = rets.filter(r => Math.abs(r) > Math.max(thresh, 0.03)).length; // seuil mini 3%
  const breakRate = breaks / rets.length; // 0..1
  const breakScore = 100 * clamp(1 - breakRate / 0.25, 0, 1); // 25% de breaks = 0

  // Combinaison V1 (C)
  const stability = Math.round(
    0.40 * volScore +
    0.30 * cohScore +
    0.30 * breakScore
  );

  // Rating
  let rating = "D";
  if(stability >= 80) rating = "A";
  else if(stability >= 65) rating = "B";
  else if(stability >= 45) rating = "C";

  // Market state
  let market_state = "Transition";
  if(stability >= 75 && breakRate < 0.10) market_state = "Stable";
  else if(stability < 55 || breakRate >= 0.20) market_state = "Volatile";

  return {stability, rating, market_state, trend: tr, breaks};
}

async function loadAndRender(){
  const err = document.getElementById("err");
  err.textContent = "";

  const res = await fetch("/data/assets.json", { cache: "no-store" });
  if(!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();

  const rows = data.map(a => {
    const close = a.close_30d || [];
    const calc = computeStability(close);

    // on remplit/écrase les champs calculés
    a.stability = calc.stability;
    a.rating = calc.rating;
    a.market_state = calc.market_state;
    a.trend = calc.trend;

    return `
      <tr>
        <td><b>${a.asset}</b></td>
        <td>${a.price}</td>
        <td>${a.chg_24h_pct}%</td>
        <td>${a.chg_7d_pct}%</td>
        <td>${a.chg_30d_pct}%</td>
        <td>${a.stability}</td>
        <td>${a.rating}</td>
        <td>${a.market_state}</td>
        <td>${a.trend}</td>
      </tr>
    `;
  }).join("");

  document.getElementById("t").innerHTML = rows;
}

window.addEventListener("DOMContentLoaded", () => {
  loadAndRender().catch(e => {
    console.error(e);
    document.getElementById("err").textContent = "Erreur: " + e.message;
  });
});
