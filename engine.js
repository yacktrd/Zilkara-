const API_URL = "/api/market";

/* helpers */

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function logNorm(x, min, max) {
  if (!x || x <= 0) return 0;

  const lx = Math.log10(x);
  const lmin = Math.log10(min);
  const lmax = Math.log10(max);

  return clamp((lx - lmin) / (lmax - lmin), 0, 1);
}

function isStable(symbol, name) {
  const s = (symbol || "").toUpperCase();
  const n = (name || "").toUpperCase();

  const stable = [
    "USDT","USDC","DAI","TUSD","FDUSD",
    "USDE","USDP","BUSD","FRAX","PYUSD","USDD"
  ];

  return (
    stable.includes(s) ||
    (s.includes("USD") && n.includes("STABLE"))
  );
}

/* SIGNAL CORE */

function calculateSignal(asset) {

  const change = asset.price_change_percentage_24h ?? 0;
  const volume = asset.total_volume ?? 0;
  const marketCap = asset.market_cap ?? 0;

  const sizeScore =
    logNorm(marketCap, 50_000_000, 300_000_000_000);

  const liquidityScore =
    logNorm(volume, 5_000_000, 30_000_000_000);

  const turnover =
    marketCap > 0 ? volume / marketCap : 0;

  const turnoverScore =
    clamp(turnover / 0.25, 0, 1);

  const momentumScore =
    clamp((change + 10) / 20, 0, 1);

  let signal =
    100 * (
      0.35 * liquidityScore +
      0.25 * turnoverScore +
      0.25 * sizeScore +
      0.15 * momentumScore
    );

  if (isStable(asset.symbol, asset.name)) {
    signal *= 0.15;
  }

  return Math.round(clamp(signal, 0, 100));
}

/* NORMALISATION */

function normalizeAsset(asset) {

  const signal = calculateSignal(asset);

  return {

    id: asset.id,
    symbol: (asset.symbol || "").toUpperCase(),
    name: asset.name || "",

    price: asset.current_price ?? 0,

    change24h:
      asset.price_change_percentage_24h ?? 0,

    marketCap:
      asset.market_cap ?? 0,

    volume:
      asset.total_volume ?? 0,

    signal

  };
}

/* FETCH + CORE */

export async function loadAssets() {

  const res = await fetch(API_URL, {
    cache: "no-store"
  });

  if (!res.ok) {
    throw new Error("API unavailable");
  }

  const json = await res.json();

  if (!json.ok) {
    throw new Error(json.error || "API error");
  }

  const raw = json.assets || [];

  const normalized =
    raw.map(normalizeAsset);

  normalized.sort(
    (a, b) => b.signal - a.signal
  );

  return normalized;
}
