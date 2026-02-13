// api/market.js
import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  try {
    const cacheDir = path.join(process.cwd(), "cache");

    // Si le noyau n’a pas encore généré, fallback propre
    if (!fs.existsSync(cacheDir)) {
      return res.status(200).json({ ok: true, assets: [], source: "cache_missing" });
    }

    const files = fs.readdirSync(cacheDir).filter(f => f.endsWith(".json") && f !== "manifest.json");
    const assets = [];

    for (const f of files) {
      const p = path.join(cacheDir, f);
      try {
        const raw = fs.readFileSync(p, "utf8");
        const obj = JSON.parse(raw);
        assets.push(obj);
      } catch {
        // ignore fichier corrompu
      }
    }

    // Tri par signal décroissant si présent
    assets.sort((a, b) => (Number(b.signal) || 0) - (Number(a.signal) || 0));

    return res.status(200).json({
      ok: true,
      count: assets.length,
      assets
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
