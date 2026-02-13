// web/engine.js
export async function loadAssets({ vs = "eur", perPage = 250, page = 1 } = {}) {
  const url =
    `https://api.coingecko.com/api/v3/coins/markets` +
    `?vs_currency=${encodeURIComponent(vs)}` +
    `&order=market_cap_desc` +
    `&per_page=${perPage}` +
    `&page=${page}` +
    `&sparkline=false`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();

  return data.map((asset) => {
    const chg24 = Number(asset.price_change_percentage_24h ?? 0);
    const vol = Number(asset.total_volume ?? 0);
    const cap = Number(asset.market_cap ?? 0);

    return {
      symbol: String(asset.symbol || "").toUpperCase(),
      name: asset.name,
      rank: asset.market_cap_rank,
      price: Number(asset.current_price ?? 0),
      chg24,
      score: calculateScore({ chg24, vol, cap }),
    };
  });
}

function calculateScore({ chg24, vol, cap }) {
  let score = 0;

  // momentum
  if (chg24 > 0) score += 25;
  if (chg24 > 5) score += 25;

  // volume strength
  if (vol > 1_000_000_000) score += 25;

  // market cap stability
  if (cap > 10_000_000_000) score += 25;

  return score;
}
