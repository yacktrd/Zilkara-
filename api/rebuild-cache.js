import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  try {

    const data = {
      updated: Date.now(),
      source: "kv",
      assets: [
        {
          symbol: "BTC",
          name: "Bitcoin",
          price: 58539,
          chg_24h_pct: 4.77,
          chg_7d_pct: 8.12,
          chg_30d_pct: 12.45,
          stability_score: 92,
          rating: "A",
          regime: "STABLE",
          similarity: 84,
          rupture_rate: 3,
          reason: "Structure stable"
        },
        {
          symbol: "ETH",
          name: "Ethereum",
          price: 1743,
          chg_24h_pct: 6.67,
          chg_7d_pct: 9.21,
          chg_30d_pct: 14.02,
          stability_score: 88,
          rating: "A",
          regime: "STABLE",
          similarity: 79,
          rupture_rate: 5,
          reason: "Momentum propre"
        }
      ]
    };

    await kv.set("zilkara_cache", data);

    return res.status(200).json({
      ok: true,
      source: "kv",
      updated: data.updated
    });

  } catch (e) {

    return res.status(500).json({
      ok: false,
      error: e.message
    });

  }
}
