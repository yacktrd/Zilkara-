// app.js
/* Zilkara — Market Scanner (frontend)
   - Responsive + lisible mobile
   - Robuste aux erreurs API
   - Filtres: preset, min/max signal, tri, limite, exclude stables
   - Auto-refresh propre (reset interval)
   - Bouton Rebuild (optionnel) si /api/rebuild est actif
*/

const API_MARKET = "/api/market";   // doit renvoyer { ok, assets: [...], source? }
const API_REBUILD = "/api/rebuild"; // optionnel: /api/rebuild?token=...

const els = {
  preset: document.getElementById("preset"),
  autoRefresh: document.getElementById("autoRefresh"),
  btnRefresh: document.getElementById("btnRefresh"),
  btnRebuild: document.getElementById("btnRebuild"),
  advancedDetails: document.getElementById("advancedDetails"),
  minSignal: document.getElementById("minSignal"),
  maxSignal: document.getElementById("maxSignal"),
  sortBy: document.getElementById("sortBy"),
  limit: document.getElementById("limit"),
  hideStables: document.getElementById("hideStables"),

  tbody: document.getElementById("tbody"),
  meta: document.getElementById("meta"),

  badge: document.getElementById("badge"),
  dot: document.getElementById("dot"),
  statusText: document.getElementById("statusText"),
  hint: document.getElementById("hint"),
  updated: document.getElementById("updated"),
  source: document.getElementById("source"),
};

const state = {
  timer: null,
  assets: [],
  lastUpdateTs: 0,
  lastSource: "",
};

const fmtEUR = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
const fmtPct = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 2 });
const fmtInt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

init();
refresh().catch(() => {});

function init() {
  // preset -> minSignal default
  applyPresetToInputs(els.preset.value);

  // Events
  els.btnRefresh.addEventListener("click", () => refresh());
  els.btnRebuild.addEventListener("click", () => rebuildCache());

  els.preset.addEventListener("change", () => {
    const v = els.preset.value;
    applyPresetToInputs(v);

    if (v === "custom") {
      els.advancedDetails.open = true;
    }

    renderOnly();
  });

  [
    els.minSignal,
    els.maxSignal,
    els.sortBy,
    els.limit,
    els.hideStables,
  ].forEach((el) => el.addEventListener("change", renderOnly));

  els.autoRefresh.addEventListener("change", () => setAutoRefresh(els.autoRefresh.value));

  // start timer
  setAutoRefresh(els.autoRefresh.value);
}

function applyPresetToInputs(preset) {
  if (preset === "all") {
    els.minSignal.value = "0";
    els.maxSignal.value = "100";
  } else if (preset === "large") {
    els.minSignal.value = "40";
    els.maxSignal.value = "100";
  } else if (preset === "pro") {
    els.minSignal.value = "60";
    els.maxSignal.value = "100";
  } else if (preset === "elite") {
    els.minSignal.value = "75";
    els.maxSignal.value = "100";
  }
}

function setAutoRefresh(secondsStr) {
  const seconds = Number(secondsStr);
  if (state.timer) clearInterval(state.timer);
  state.timer = null;

  if (!Number.isFinite(seconds) || seconds <= 0) {
    setStatus("Prêt (auto-refresh: OFF)", "warn");
    return;
  }

  setStatus(`Prêt (auto-refresh: ${seconds}s)`, "ok");
  state.timer = setInterval(() => {
    refresh().catch(() => {});
  }, seconds * 1000);
}

async function refresh() {
  setStatus("Chargement…", "warn");
  els.hint.textContent = "Chargement des données depuis l’API…";

  const data = await fetchJson(API_MARKET, { cache: "no-store" });

  if (!data || data.ok !== true) {
    const msg = data?.error ? String(data.error) : "Load failed";
    throw new Error(msg);
  }

  const assetsRaw = Array.isArray(data.assets) ? data.assets : [];
  state.assets = assetsRaw.map(normalizeAsset).filter(Boolean);
  state.lastUpdateTs = Date.now();
  state.lastSource = typeof data.source === "string" ? data.source : "";

  setStatus("OK", "ok");
  els.hint.innerHTML = `Filtrage local actif.`;

  renderOnly();
}

async function rebuildCache() {
  // Si tu veux protéger l’endpoint, il doit être appelé avec token.
  // Ici on le lit dans localStorage pour éviter de l’écrire dans le code.
  // Dans la console iOS/desktop, tu peux faire: localStorage.setItem("REBUILD_TOKEN","xxxx")
  const token = localStorage.getItem("REBUILD_TOKEN") || "";

  setStatus("Rebuild…", "warn");

  const url = token ? `${API_REBUILD}?token=${encodeURIComponent(token)}` : API_REBUILD;
  const res = await fetchJson(url, { cache: "no-store" });

  if (!res || res.ok !== true) {
    const msg = res?.error ? String(res.error) : "Rebuild failed";
    setStatus(`Rebuild: ${msg}`, "bad");
    els.hint.textContent = "Le rebuild a échoué. Vérifie ton token et ton endpoint serveur.";
    return;
  }

  setStatus("Rebuild OK → refresh", "ok");
  els.hint.textContent = "Rebuild OK. Rafraîchissement…";
  await refresh();
}

function renderOnly() {
  const raw = state.assets || [];
  const filtered = applyFilters(raw);
  renderTable(filtered);
  renderMeta(raw, filtered);
}

function applyFilters(list) {
  const min = clampInt(Number(els.minSignal.value ?? 0), 0, 100);
  const max = clampInt(Number(els.maxSignal.value ?? 100), 0, 100);
  const limit = clampInt(Number(els.limit.value ?? 50), 1, 250);
  const sortBy = String(els.sortBy.value || "signal");
  const hideStables = Boolean(els.hideStables.checked);

  let out = list
    .filter((a) => a.signal >= min && a.signal <= max);

  if (hideStables) {
    out = out.filter((a) => !isStablecoin(a.symbol, a.name));
  }

  out.sort((a, b) => compareBy(sortBy, a, b));

  return out.slice(0, limit);
}

function renderTable(rows) {
  els.tbody.innerHTML = "";

  if (!rows.length) {
    els.tbody.innerHTML = `<tr><td colspan="4" style="padding:14px 12px;color:rgba(255,255,255,.62);">
      Aucun résultat (filtre trop strict, ou API vide).
    </td></tr>`;
    return;
  }

  const frag = document.createDocumentFragment();

  for (const a of rows) {
    const tr = document.createElement("tr");

    // Symbol + name
    const tdSym = document.createElement("td");
    tdSym.setAttribute("data-label", "Symbole");
    tdSym.innerHTML = `<span class="sym">${escapeHtml(a.symbol)}</span>
      <span class="name">${escapeHtml(a.name || "")}</span>`;
    tr.appendChild(tdSym);

    // Price
    const tdPrice = document.createElement("td");
    tdPrice.className = "num";
    tdPrice.setAttribute("data-label", "Prix");
    tdPrice.textContent = a.price != null ? fmtEUR.format(a.price) : "—";
    tr.appendChild(tdPrice);

    // 24h change
    const tdChg = document.createElement("td");
    tdChg.className = "num chg " + (a.change24h >= 0 ? "pos" : "neg");
    tdChg.setAttribute("data-label", "24h");
    tdChg.textContent = Number.isFinite(a.change24h) ? fmtPct.format(a.change24h / 100) : "—";
    tr.appendChild(tdChg);

    // Signal
    const tdSig = document.createElement("td");
    tdSig.className = "sig";
    tdSig.setAttribute("data-label", "Signal");
    tdSig.textContent = String(a.signal);
    tr.appendChild(tdSig);

    frag.appendChild(tr);
  }

  els.tbody.appendChild(frag);
}

function renderMeta(raw, filtered) {
  const total = raw.length;
  const shown = filtered.length;

  els.updated.textContent = state.lastUpdateTs ? formatTime(state.lastUpdateTs) : "—";
  els.source.textContent = state.lastSource || "—";

  const min = clampInt(Number(els.minSignal.value ?? 0), 0, 100);
  const max = clampInt(Number(els.maxSignal.value ?? 100), 0, 100);
  const sortBy = els.sortBy.value || "signal";
  const limit = els.limit.value || "50";

  els.meta.innerHTML = `
    <div><strong>Filtre</strong> min ${min} / max ${max} · <strong>Tri</strong> ${escapeHtml(sortBy)} · <strong>Limite</strong> ${escapeHtml(limit)}</div>
    <div><strong>Résultats</strong> ${shown}/${total}</div>
  `;

  // Hint contextual
  if (state.lastSource === "cache_missing") {
    els.hint.innerHTML = `Source = <code>cache_missing</code> : ton endpoint serveur n’a pas de cache à lire.
    Soit tu n’as pas exécuté <code>/api/rebuild</code>, soit ton cache n’est pas persistant sur Vercel.`;
  }
}

function setStatus(text, level) {
  els.statusText.textContent = text;

  els.dot.classList.remove("ok", "warn", "bad");
  if (level === "ok") els.dot.classList.add("ok");
  else if (level === "bad") els.dot.classList.add("bad");
  else els.dot.classList.add("warn");
}

async function fetchJson(url, options = {}) {
  try {
    const res = await fetch(url, {
      method: "GET",
      ...options,
      headers: { "Accept": "application/json", ...(options.headers || {}) },
    });

    const ct = res.headers.get("content-type") || "";
    const isJson = ct.includes("application/json");

    if (!res.ok) {
      const body = isJson ? await res.json().catch(() => null) : await res.text().catch(() => "");
      const msg = body?.error ? String(body.error) : (typeof body === "string" && body ? body : `HTTP ${res.status}`);
      setStatus(`Erreur API: ${msg}`, "bad");
      els.hint.textContent = "Erreur API. Regarde /api/market directement pour le message exact.";
      return { ok: false, error: msg };
    }

    return isJson ? await res.json() : { ok: false, error: "Non-JSON response" };
  } catch (e) {
    const msg = e?.message ? String(e.message) : String(e);
    setStatus(`Erreur API: ${msg}`, "bad");
    els.hint.textContent = "Erreur réseau (fetch).";
    return { ok: false, error: msg };
  }
}

function normalizeAsset(a) {
  if (!a || typeof a !== "object") return null;

  // compat: certains endpoints renvoient {asset, ...}
  const symbol = String(a.symbol || a.asset || "").toUpperCase().trim();
  if (!symbol) return null;

  const name = typeof a.name === "string" ? a.name : "";

  // champs possibles (coingecko style)
  const price = num(a.current_price ?? a.price);
  const change24h = num(a.price_change_percentage_24h ?? a.change24h ?? a.change_24h);
  const volume = num(a.total_volume ?? a.volume);
  const marketCap = num(a.market_cap ?? a.marketCap);

  // signal déjà calculé côté serveur (idéal), sinon fallback simple
  let signal = num(a.signal);
  if (!Number.isFinite(signal)) {
    // fallback: donne un score très bas plutôt que du n’importe quoi
    signal = 0;
  }
  signal = clampInt(signal, 0, 100);

  return {
    symbol,
    name,
    price,
    change24h: Number.isFinite(change24h) ? change24h : 0,
    volume: Number.isFinite(volume) ? volume : 0,
    marketCap: Number.isFinite(marketCap) ? marketCap : 0,
    signal,
  };
}

function compareBy(key, a, b) {
  switch (key) {
    case "price": return (b.price || 0) - (a.price || 0);
    case "change24h": return (b.change24h || 0) - (a.change24h || 0);
    case "marketCap": return (b.marketCap || 0) - (a.marketCap || 0);
    case "volume": return (b.volume || 0) - (a.volume || 0);
    case "symbol": return a.symbol.localeCompare(b.symbol);
    case "signal":
    default:
      return (b.signal || 0) - (a.signal || 0);
  }
}

function isStablecoin(symbol, name = "") {
  const s = String(symbol || "").toUpperCase();
  const n = String(name || "").toUpperCase();

  const stables = new Set([
    "USDT","USDC","DAI","TUSD","FDUSD","USDE","USDP","BUSD","FRAX","PYUSD","USDD","EURC","EURT",
  ]);

  if (stables.has(s)) return true;
  if (s.includes("USD") && n.includes("STABLE")) return true;
  if (n.includes("TETHER")) return true;
  if (n.includes("STABLECOIN")) return true;
  return false;
}

function num(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : NaN;
}

function clampInt(n, min, max) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function formatTime(ts) {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
