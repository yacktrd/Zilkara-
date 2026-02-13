// api/market.js
import fs from "fs";
import path from "path";

const CACHE_FILE = "/tmp/cache/market.json";

export default async function handler(req, res) {

  try {

    if (!fs.existsSync(CACHE_FILE)) {

      return res.json({
        ok: true,
        assets: [],
        source: "cache_missing"
      });

    }

    const raw = fs.readFileSync(CACHE_FILE, "utf-8");

    const data = JSON.parse(raw);

    return res.json({
      ok: true,
      assets: data.assets,
      source: "cache"
    });

  } catch (err) {

    return res.status(500).json({
      ok: false,
      error: err.message
    });

  }
}
