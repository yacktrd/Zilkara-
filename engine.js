const API_URL =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&order=market_cap_desc&per_page=250&page=1&sparkline=false";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function logNorm(x, min, max) {
  const lx = Math.log10(Math.max(x, 1));
  const lmin = Math.log10(min);
  const lmax = Math.log10(max);
  return clamp((lx - lmin) / (lmax - lmin), 0, 1);
}

function isStable(symbol, name) {
  const s = symbol.toUpperCase();
  const n = (name || "").toUpperCase();

  const stableSymbols = [
    "USDT", "USDC", "DAI", "TUSD",
    "FDUSD", "USDE", "USDP", "BUSD",
    "FRAX", "PYUSD", "USDD"
  ];

  return stableSymbols.includes(s) ||
    (n.includes("USD") &&
     (n.includes("STABLE") ||
      n.includes("TETHER") ||
      n.includes("COIN")));
}

function calculateScore(asset) {

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

  let score =
    100 * (
      0.35 * liquidityScore +
      0.25 * turnoverScore +
      0.25 * sizeScore +
      0.15 * momentumScore
    );

  if (isStable(asset.symbol, asset.name)) {
    score *= 0.15;
  }

  return Math.round(clamp(score, 0, 100));
}

export async function loadAssets() {

  const res =
    await fetch(API_URL, { cache: "no-store" });

  if (!res.ok) {
    throw new Error("API error");
  }

  const data = await res.json();

  return data.map(asset => {

    const score = calculateScore(asset);

    return {

      symbol: asset.symbol.toUpperCase(),

      name: asset.name,

      price: asset.current_price,

      change24h:
        asset.price_change_percentage_24h ?? 0,

      volume:
        asset.total_volume ?? 0,

      marketCap:
        asset.market_cap ?? 0,

      score

    };

  });

}
