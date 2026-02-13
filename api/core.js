// api/core.js
// Endpoint Vercel: /api/core?symbol=BTC

export default async function handler(req, res) {

  const { symbol } = req.query;

  if (!symbol) {
    return res.status(400).json({
      error: "Missing symbol"
    });
  }

  try {

    // IMPORTANT :
    // Ici tu brancheras TON noyau réel plus tard.
    // Pour l'instant on crée une version stable simulée.

    const regime = computeRegimeStub(symbol);
    const rupture_rate = computeRuptureStub(symbol);

    const watch =
      rupture_rate < 15 ? "NORMAL" :
      rupture_rate < 35 ? "PROTECT" :
      "NEUTRAL";

    const reason =
      rupture_rate < 15 ? "Stable regime" :
      rupture_rate < 35 ? "Elevated transitions" :
      "High instability";

    res.status(200).json({
      symbol,
      regime,
      rupture_rate,
      watch,
      reason,
      timestamp: Date.now()
    });

  }
  catch (e) {

    res.status(500).json({
      error: "Core failure",
      message: String(e)
    });

  }

}


// --- STUBS (remplacés plus tard par ton vrai noyau) ---

function computeRegimeStub(symbol) {

  const hash = hashCode(symbol);

  if (hash % 3 === 0) return "STABLE";
  if (hash % 3 === 1) return "TRANSITION";

  return "CHAOTIC";

}

function computeRuptureStub(symbol) {

  const hash = hashCode(symbol);

  return Math.abs(hash % 50);

}


// simple hash déterministe

function hashCode(str) {

  let h = 0;

  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }

  return h;

}
