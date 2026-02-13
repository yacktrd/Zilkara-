// api/rebuild.js
import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  try {
    // --- 1) Sécurité ---
    const token = String(req.query.token || "");
    const expected = process.env.REBUILD_TOKEN || ""; // Mets-le dans Vercel Env
    if (!expected) {
      return res.status(500).json({ ok: false, error: "Missing REBUILD_TOKEN env var" });
    }
    if (token !== expected) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    // --- 2) Lock anti-concurrence ---
    const cacheDir = path.join(process.cwd(), "cache");
    const lockFile = path.join(cacheDir, ".rebuild.lock");

    fs.mkdirSync(cacheDir, { recursive: true });

    // lock TTL (si crash) : 20 minutes
    const now = Date.now();
    const LOCK_TTL_MS = 20 * 60 * 1000;

    if (fs.existsSync(lockFile)) {
      const stat = fs.statSync(lockFile);
      const age = now - stat.mtimeMs;
      if (age < LOCK_TTL_MS) {
        return res.status(409).json({ ok: false, error: "Rebuild already running" });
      }
      // lock stale -> on le remplace
      try { fs.unlinkSync(lockFile); } catch {}
    }

    fs.writeFileSync(lockFile, String(now), "utf8");

    // --- 3) Rebuild ---
    // Universe V1 : top 20
    const universe = [
      "BTC","ETH","BNB","SOL","XRP","ADA","DOGE","TRX","TON","DOT",
      "AVAX","LINK","MATIC","LTC","BCH","UNI","ATOM","XLM","ICP","FIL"
    ];

    const startedAt = new Date().toISOString();
    const results = [];

    for (const symbol of universe) {
      // A) Récupérer OHLCV/historique (à implémenter selon ta source)
      // IMPORTANT : ici on ne décrit pas la logique interne du noyau.
      const ohlcv = await fetchOhlcvForCore(symbol);

      // B) Appeler ton noyau (déjà existant dans ton projet) → sortie standard
      const coreOut = await runCoreEngine(symbol, ohlcv);

      // C) Écriture atomique: écrire .tmp puis rename
      const outFile = path.join(cacheDir, `${symbol}.json`);
      const tmpFile = path.join(cacheDir, `${symbol}.json.tmp`);

      const payload = {
        asset: symbol,
        // le noyau doit produire des champs stables (contrat de sortie figé)
        ...coreOut,
        updated_at: new Date().toISOString()
      };

      fs.writeFileSync(tmpFile, JSON.stringify(payload, null, 2), "utf8");
      fs.renameSync(tmpFile, outFile);

      results.push({ asset: symbol, ok: true });
    }

    // --- 4) Manifest global (optionnel mais utile) ---
    const manifest = {
      ok: true,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      assets: universe,
    };
    fs.writeFileSync(
      path.join(cacheDir, "manifest.json.tmp"),
      JSON.stringify(manifest, null, 2),
      "utf8"
    );
    fs.renameSync(
      path.join(cacheDir, "manifest.json.tmp"),
      path.join(cacheDir, "manifest.json")
    );

    // --- 5) Unlock ---
    try { fs.unlinkSync(lockFile); } catch {}

    return res.status(200).json({ ok: true, rebuilt: results.length, results });
  } catch (e) {
    // Unlock best effort
    try {
      const cacheDir = path.join(process.cwd(), "cache");
      const lockFile = path.join(cacheDir, ".rebuild.lock");
      if (fs.existsSync(lockFile)) fs.unlinkSync(lockFile);
    } catch {}

    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}

/**
 * Récupère l'historique OHLCV nécessaire au noyau.
 * Ici tu branches ta source (Binance/Bybit/Coinbase/etc) selon ton projet.
 * Retour attendu : tableau de bougies [{t,o,h,l,c,v}, ...]
 */
async function fetchOhlcvForCore(symbol) {
  // Placeholder: à remplacer par ton fetch existant
  // Exemple: return await getOhlcv(symbol, "1h", 24*365);
  return [];
}

/**
 * Appel du noyau RFS.
 * IMPORTANT : on ne réécrit pas ta méthode ici.
 * Tu branches la fonction existante dans ton projet (engine / core).
 * Retour attendu : objet stable { signal, regime, rupture_rate, watch, reason, ... }
 */
async function runCoreEngine(symbol, ohlcv) {
  // Placeholder à remplacer par ton import réel:
  // import { computeCore } from "../core/engine.js";
  // return computeCore({ symbol, ohlcv });

  return {
    signal: 0,
    regime: "NEUTRAL",
    rupture_rate: 0,
    watch: "NEUTRAL",
    reason: "Core not wired yet"
  };
}

