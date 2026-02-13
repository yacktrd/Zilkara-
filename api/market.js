import fs from "fs";
import path from "path";

const CACHE_DIR = "/tmp/cache";
const CACHE_FILE = path.join(CACHE_DIR, "market.json");

async function fetchFresh() {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&order=market_cap_desc&per_page=250&page=1"
  );

  const data = await res.json();

  const assets = data.map(asset => ({
    symbol: asset.symbol.toUpperCase(),
    name: asset.name,
    price: asset.current_price,
    change24h: asset.price_change_percentage_24h,
    volume24h: asset.total_volume,
    marketCap: asset.market_cap,
    signal: Math.min(
      100,
      Math.round(
        (Math.log10(asset.market_cap || 1) * 10) +
        Math.abs(asset.price_change_percentage_24h || 0)
      )
    )
  }));

  if (!fs.existsSync(CACHE_DIR))
    fs.mkdirSync(CACHE_DIR, { recursive: true });

  fs.writeFileSync(
    CACHE_FILE,
    JSON.stringify({
      assets,
      updated: Date.now()
    })
  );

  return assets;
}

export default async function handler(req, res) {
  try {

    let assets = [];
    let source = "cache";

    if (fs.existsSync(CACHE_FILE)) {

      const raw = fs.readFileSync(CACHE_FILE, "utf8");
      const data = JSON.parse(raw);
      assets = data.assets || [];

    } else {

      assets = await fetchFresh();
      source = "fresh";

    }

    res.setHeader("Cache-Control", "no-store");

    return res.json({
      ok: true,
      count: assets.length,
      assets,
      source
    });

  } catch (e) {

    return res.status(500).json({
      ok: false,
      error: e.message
    });

  }
}
