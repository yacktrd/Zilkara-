// web/app.js — Zilkara (Scanner + Affiliation)
// Dépendances: aucune
// Requiert dans index.html :
// - <table id="scanner"><tbody>...</tbody></table>
// - éléments: #search, #sort, #filter, #status-text
// - script chargé via: <script src="/app.js"></script>

"use strict";

/* =========================
   CONFIG AFFILIATION
   ========================= */

// Choisis ton exchange principal ici : "binance" | "bybit" | "kraken"
const AFFILIATE_EXCHANGE = "binance";

// IMPORTANT: remplace par ton code/ref réel
const AFFILIATE_REF = "1216069378";

// Pair par défaut
const QUOTE = "USDT";

// Génération liens (simples et robustes)
function affiliateUrl(symbol) {
  const baseSymbol = String(symbol || "").toUpperCase();
  const pair = `${baseSymbol}${QUOTE}`;      // ex: BTCUSDT
  const pair2 = `${baseSymbol}_${QUOTE}`;    // ex: BTC_USDT (Binance web)

  if (AFFILIATE_EXCHANGE === "bybit") {
    // Bybit spot/perp varie; ce lien marche souvent en redirection
    return `https://www.bybit.com/trade/usdt/${pair}?ref=${encodeURIComponent(AFFILIATE_REF)}`;
  }

  if (AFFILIATE_EXCHANGE === "kraken") {
    // Kraken n’a pas toujours un deep link “pair”; on envoie vers la page Markets
    // (tu peux remplacer par ton lien affilié Kraken si tu en as un spécifique)
    return `https://www.kraken.com/prices/${baseSymbol}-${QUOTE}-price-chart?utm_ref=${encodeURIComponent(AFFILIATE_REF)}`;
  }

  // Binance (par défaut)
  // NB: Binance peut varier selon région/langue, mais ce pattern est standard web
  return `https://www.binance.com/en/trade/${pair2}?ref=${encodeURIComponent(AFFILIATE_REF)}`;
}

/* =========================
   CONFIG APP
   ========================= */

const API_URL = "/api/market";
const REFRESH_MS = 10000; // 10s

// Watchlist locale
const LS_WATCH = "zilkara_watchlist_v1";
let WATCH = loadWatch();

// Cache côté front (utile si l’API renvoie la même chose)
let lastData = [];
let timer = null;

/* =========================
   UTILITAIRES
   ========================= */

function $(sel) { return document.querySelector(sel); }

function loadWatch() {
  try {
    const raw = localStorage.getItem(LS_WATCH);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveWatch() {
  localStorage.setItem(LS_WATCH, JSON.stringify(Array.from(WATCH)));
}

function toggleWatch(symbol) {
  const s = String(symbol || "").toUpperCase();
  if (WATCH.has(s)) WATCH.delete(s);
  else WATCH.add(s);
  saveWatch();
  render(); // re-render sans attendre le prochain fetch
}

function n(v, def = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : def;
}

function fmtPriceEUR(v) {
  const x = n(v, NaN);
  if (!Number.isFinite(x)) return "—";
  let max = 2;
  if (x < 1) max = 4;
  if (x < 0.01) max = 6;

  return x.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: max,
  });
}

function fmtCompact(v) {
  const x = n(v, NaN);
  if (!Number.isFinite(x)) return "—";

  const abs = Math.abs(x);
  const sign = x < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9)  return `${sign}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6)  return `${sign}${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3)  return `${sign}${(abs / 1e3).toFixed(2)}K`;
  return `${x.toLocaleString("fr-FR")}`;
}

function fmtPct(v) {
  const x = n(v, 0);
  const s = (x >= 0 ? "+" : "") + x.toFixed(2) + "%";
  const cls = x >= 0 ? "pos" : "neg";
  return `<span class="${cls}">${s}</span>`;
}

function badgeForRating(rating) {
  const r = String(rating || "").toUpperCase();
  if (r === "STRONG") return `<span class="badge good">STRONG</span>`;
  if (r === "GOOD")   return `<span class="badge warn">GOOD</span>`;
  if (r === "WEAK")   return `<span class="badge warn">WEAK</span>`;
  return `<span class="badge bad">AVOID</span>`;
}

function setStatus(text) {
  const el = $("#status-text");
  if (el) el.textContent = text;
}

/* =========================
   FETCH + RENDER
   ========================= */

async function fetchMarket() {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 9000); // timeout 9s
  try {
    const res = await fetch(API_URL, { cache: "no-store", signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    clearTimeout(t);

    // Notre API renvoie { assets: [...] }
    const assets = Array.isArray(json.assets) ? json.assets : [];
    return assets;
  } finally {
    clearTimeout(t);
  }
}

function applyFilters(list) {
  const q = ($("#search")?.value || "").trim().toLowerCase();
  const sort = $("#sort")?.value || "score_desc";
  const filter = $("#filter")?.value || "all";

  let data = Array.isArray(list) ? [...list] : [];

  // Search
  if (q) {
    data = data.filter(a => {
      const sym = String(a.symbol || "").toLowerCase();
      const name = String(a.name || "").toLowerCase();
      return sym.includes(q) || name.includes(q);
    });
  }

  // Filter
  if (filter === "favorites") {
    data = data.filter(a => WATCH.has(String(a.symbol || "").toUpperCase()));
  } else if (filter === "strong") {
    data = data.filter(a => String(a.rating || "").toUpperCase() === "STRONG");
  } else if (filter === "watch") {
    data = data.filter(a => String(a.rating || "").toUpperCase() === "GOOD");
  } else if (filter === "weak") {
    data = data.filter(a => String(a.rating || "").toUpperCase() === "WEAK");
  } else if (filter === "avoid") {
    data = data.filter(a => String(a.rating || "").toUpperCase() === "AVOID");
  }

  // Sort
  const by = {
    score_desc: (a,b) => n(b.score) - n(a.score),
    score_asc:  (a,b) => n(a.score) - n(b.score),

    mc_desc:    (a,b) => n(b.market_cap) - n(a.market_cap),
    mc_asc:     (a,b) => n(a.market_cap) - n(b.market_cap),

    vol_desc:   (a,b) => n(b.volume_24h) - n(a.volume_24h),
    vol_asc:    (a,b) => n(a.volume_24h) - n(b.volume_24h),

    chg24_desc: (a,b) => n(b.chg_24h) - n(a.chg_24h),
    chg24_asc:  (a,b) => n(a.chg_24h) - n(b.chg_24h),

    chg7_desc:  (a,b) => n(b.chg_7d) - n(a.chg_7d),
    chg7_asc:   (a,b) => n(a.chg_7d) - n(b.chg_7d),

    chg30_desc: (a,b) => n(b.chg_30d) - n(a.chg_30d),
    chg30_asc:  (a,b) => n(a.chg_30d) - n(b.chg_30d),
  }[sort];

  if (by) data.sort(by);

  return data;
}

function showLoading() {
  const tbody = $("#scanner tbody");
  if (!tbody) return;
  tbody.innerHTML = `
    <tr>
      <td colspan="12" style="text-align:center;padding:18px;color:#aab4bf;">
        Chargement du marché…
      </td>
    </tr>
  `;
}

function showError(msg) {
  const tbody = $("#scanner tbody");
  if (!tbody) return;
  tbody.innerHTML = `
    <tr>
      <td colspan="12" style="text-align:center;padding:18px;color:#fb7185;">
        ${msg || "Erreur de connexion. Nouvelle tentative automatique."}
      </td>
    </tr>
  `;
}

function render() {
  const tbody = $("#scanner tbody");
  if (!tbody) return;

  const data = applyFilters(lastData);

  tbody.innerHTML = "";

  for (const a of data) {
    const sym = String(a.symbol || "").toUpperCase();
    const isFav = WATCH.has(sym);

    const tradeLink = affiliateUrl(sym);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="center">
        <span class="star ${isFav ? "on" : ""}" data-star="${sym}" title="Watchlist">
          ${isFav ? "★" : "☆"}
        </span>
      </td>

      <td class="right">${n(a.rank, "") || "—"}</td>
      <td class="mono">${sym}</td>

      <td class="right">${fmtPriceEUR(a.price)}</td>

      <td class="right mono">${n(a.score)}</td>

      <td>${badgeForRating(a.rating)}</td>

      <td class="right">${fmtPct(a.chg_24h)}</td>
      <td class="right">${fmtPct(a.chg_7d)}</td>
      <td class="right">${fmtPct(a.chg_30d)}</td>

      <td class="right mono">${fmtCompact(a.market_cap)}</td>
      <td class="right mono">${fmtCompact(a.volume_24h)}</td>

      <td class="center">
        <a href="${tradeLink}" target="_blank" rel="noopener noreferrer"
           style="text-decoration:none;border:1px solid #1d2430;background:#141a22;padding:6px 10px;border-radius:10px;color:#e8edf2;font-size:12px;font-weight:700;letter-spacing:.3px;">
          Trade
        </a>
      </td>
    `;

    tbody.appendChild(tr);
  }

  // Bind stars
  tbody.querySelectorAll("[data-star]").forEach(el => {
    el.addEventListener("click", () => toggleWatch(el.getAttribute("data-star")));
  });
}

async function loadMarket() {
  showLoading();
  setStatus("loading…");

  try {
    const assets = await fetchMarket();
    lastData = assets;

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    setStatus(`${hh}:${mm}`);

    render();
  } catch (e) {
    console.error(e);
    setStatus("offline");
    showError("API indisponible. Nouvelle tentative automatique.");
  }
}

function bindUI() {
  const search = $("#search");
  const sort = $("#sort");
  const filter = $("#filter");

  if (search) search.addEventListener("input", () => render());
  if (sort) sort.addEventListener("change", () => render());
  if (filter) filter.addEventListener("change", () => render());
}

function start() {
  bindUI();
  loadMarket();

  if (timer) clearInterval(timer);
  timer = setInterval(loadMarket, REFRESH_MS);
}

document.addEventListener("DOMContentLoaded", start);

