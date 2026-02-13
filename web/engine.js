export async function loadAssets() {

  const API_URL =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&order=market_cap_desc&per_page=250&page=1";

  const res = await fetch(API_URL, { cache:"no-store" });

  if (!res.ok)
    throw new Error("API error");

  const data = await res.json();

  return data.map(asset => ({

    symbol: asset.symbol.toUpperCase(),

    price: asset.current_price,

    change24h: asset.price_change_percentage_24h ?? 0,

    volume: asset.total_volume ?? 0,

    marketCap: asset.market_cap ?? 0,

    score: calculateScore(asset)

  }));
}

function calculateScore(asset){

  let score = 0;

  const chg = asset.price_change_percentage_24h ?? 0;

  if (chg > 0) score += 25;
  if (chg > 5) score += 25;

  if ((asset.total_volume ?? 0) > 1_000_000_000)
    score += 25;

  if ((asset.market_cap ?? 0) > 10_000_000_000)
    score += 25;

  return score;
}
