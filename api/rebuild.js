// api/rebuild.js
import fs from "fs";
import path from "path";

const CACHE_DIR = "/tmp/cache";
const CACHE_FILE = path.join(CACHE_DIR, "market.json");

export default async function handler(req, res) {

  try {

    // sécurité token
    const token = req.query.token;

    if (token !== process.env.REBUILD_TOKEN) {
      return res.status(401).json({
        ok: false,
        error: "Unauthorized"
      });
    }

    // créer dossier cache
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }

    // fetch CoinGecko
    const response = await fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&order=market_cap_desc&per_page=250&page=1&sparkline=false"
    );

    const data = await response.json();

    // créer signal simple
    const assets = data.map(asset => ({
      symbol: asset.symbol.toUpperCase(),
      name: asset.name,
      price: asset.current_price,
      change24h: asset.price_change_percentage_24h,
      volume: asset.total_volume,
      marketCap: asset.market_cap,
      signal: Math.min(
        100,
        Math.round(
          (Math.log10(asset.market_cap || 1) * 10) +
          (Math.abs(asset.price_change_percentage_24h || 0))
        )
      )
    }));

    // écrire cache
    fs.writeFileSync(
      CACHE_FILE,
      JSON.stringify({
        ok: true,
        assets,
        updated: Date.now()
      })
    );

    return res.json({
      ok: true,
      count: assets.length
    });

  } catch (err) {

    return res.status(500).json({
      ok: false,
      error: err.message
    });

  }
}
