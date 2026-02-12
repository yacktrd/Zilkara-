// Zilkara Real Crypto Engine
// Fetch CoinGecko + calculate score

const API_URL =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false";

export async function loadAssets() {
  const res = await fetch(API_URL);
  const data = await res.json();

  return data.map(asset => ({
    symbol: asset.symbol.toUpperCase(),
    name: asset.name,
    price: asset.current_price,
    change24h: asset.price_change_percentage_24h || 0,
    volume: asset.total_volume || 0,
    marketCap: asset.market_cap || 0,
    score: calculateScore(asset)
  }));
}

function calculateScore(asset) {

  let score = 0;

  // momentum
  if (asset.price_change_percentage_24h > 0) score += 25;
  if (asset.price_change_percentage_24h > 5) score += 25;

  // volume strength
  if (asset.total_volume > 100000000) score += 25;

  // market cap stability
  if (asset.market_cap > 1000000000) score += 25;

  return score;
}
