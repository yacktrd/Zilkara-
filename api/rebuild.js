api/rebuild.js

import { kv } from "@vercel/kv";

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed"
    });
  }

  try {

    const assets = [
      {
        symbol: "BTC",
        name: "Bitcoin",
        price: 58539,
        stability_score: 92,
        rating: "A",
        regime: "STABLE"
      },
      {
        symbol: "ETH",
        name: "Ethereum",
        price: 1743,
        stability_score: 88,
        rating: "A",
        regime: "STABLE"
      }
    ];

    await kv.set("market:assets", assets);
    await kv.set("market:updated", Date.now());

    return res.status(200).json({
      ok: true,
      message: "Cache rebuilt successfully",
      source: "kv"
    });

  } catch (err) {

    return res.status(500).json({
      ok: false,
      error: err.message
    });

  }
}
