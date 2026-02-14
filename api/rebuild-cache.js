import { kv } from '@vercel/kv'

export default async function handler(req, res) {

  try {

    // Test connexion KV
    await kv.set('zilkara:test', 'ok')

    // Exemple cache
    const cache = {
      ok: true,
      updated: Date.now(),
      source: 'kv',
      assets: [
        {
          symbol: "BTC",
          name: "Bitcoin",
          stability_score: 92,
          rating: "A",
          regime: "STABLE"
        }
      ]
    }

    await kv.set('zilkara:cache', cache)

    return res.status(200).json({
      ok: true,
      message: 'Cache rebuilt successfully',
      source: 'kv'
    })

  } catch (err) {

    console.error(err)

    return res.status(500).json({
      ok: false,
      error: err.message
    })

  }

}
