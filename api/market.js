// /api/market.js
// Source: CoinGecko markets (EUR)
// Cache: mémoire (warm) + TTL pour performance

let CACHE = {
  ts: 0,
  payload: null
};

const TTL_MS = 60_000; // 60s

function clamp(n, a, b){
  n = Number(n);
  if (!Number.isFinite(n)) return a;
  return Math.max(a, Math.min(b, n));
}

function computeSignal({ marketCap, volume24h, change24h }) {
  // Signal MVP (0–100) = synthèse taille + liquidité + mouvement
  // (volontairement non-prédictif / non-propriétaire)
  const mc = Math.max(1, Number(marketCap || 0));
  const vol = Math.max(1, Number(volume24h || 0));
  const ch = Math.abs(Number(change24h || 0));

  const sizeScore = clamp((Math.log10(mc) - 6) * 8, 0, 55);
  const volScore  = clamp((Math.log10(vol) - 5) * 7, 0, 30);
  const momScore  = clamp(ch * 1.2, 0, 15);

  return clamp(Math.round(sizeScore + volScore + momScore), 0, 100);
}

async function fetchCoinGecko() {
  const url =
    "https://api.coingecko.com/api/v3/coins/markets" +
    "?vs_currency=eur&order=market_cap_desc&per_page=250&page=1" +
    "&sparkline=false&price_change_percentage=24h";

  const r = await fetch(url, { headers: { "accept":"application/json" } });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`CoinGecko ${r.status}: ${t}`);
  }
  return r.json();
}

export default async function handler(req, res) {
  try {
    res.setHeader("Cache-Control", "no-store");

    const now = Date.now();
    if (CACHE.payload && (now - CACHE.ts) < TTL_MS) {
      return res.status(200).json({ ...CACHE.payload, source: "cache_mem" });
    }

    const data = await fetchCoinGecko();

    const assets = data.map((a, idx) => {
      const marketCap = Number(a.market_cap || 0);
      const volume24h = Number(a.total_volume || 0);
      const change24h = Number(a.price_change_percentage_24h || 0);

      const signal = computeSignal({ marketCap, volume24h, change24h });

      return {
        rank: idx + 1,
        id: a.id,
        symbol: String(a.symbol || "").toUpperCase(),
        name: String(a.name || ""),
        image: a.image || "",
        price: Number(a.current_price || 0),
        change24h,
        volume24h,
        marketCap,
        signal
      };
    });

    const payload = {
      ok: true,
      updated: now,
      assets
    };

    CACHE = { ts: now, payload };

    return res.status(200).json({ ...payload, source: "coingecko" });
  } catch (e) {
    return res.status(500).json({ ok:false, error: String(e?.message || e) });
  }
}
