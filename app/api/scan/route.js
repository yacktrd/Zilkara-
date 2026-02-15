import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cache in-memory (par instance)
 * NOTE: sur Vercel serverless, ça tient tant que l'instance vit.
 */
const CACHE_KEY = "scan_v1";
const TTL_MS = 30_000; // 30s (tu pourras passer à 60s ensuite)

function now() {
  return Date.now();
}

function ok(data) {
  return Response.json(
    { ok: true, ts: now(), data },
    {
      status: 200,
      headers: {
        "Cache-Control": `public, max-age=0, s-maxage=${Math.floor(TTL_MS / 1000)}, stale-while-revalidate=30`,
      },
    }
  );
}

function fail(code, message, status = 500) {
  return Response.json(
    { ok: false, ts: now(), data: [], error: { code, message } },
    { status }
  );
}

function getCache() {
  const g = globalThis;
  g.__ZILKARA_CACHE__ ||= {};
  const entry = g.__ZILKARA_CACHE__[CACHE_KEY];
  if (!entry) return null;
  if (entry.exp < now()) return null;
  return entry.value;
}

function setCache(value) {
  const g = globalThis;
  g.__ZILKARA_CACHE__ ||= {};
  g.__ZILKARA_CACHE__[CACHE_KEY] = {
    exp: now() + TTL_MS,
    value,
  };
}

export async function GET() {
  const t0 = now();

  try {
    // 1) cache hit
    const cached = getCache();
    if (cached) {
      console.log(`[scan] HIT ${cached.length} items (${now() - t0}ms)`);
      return ok(cached);
    }

    // 2) lire ton fichier local (ou ta source actuelle)
    const filePath = path.join(process.cwd(), "data", "assets.json");

    if (!fs.existsSync(filePath)) {
      console.log(`[scan] ERROR missing file: ${filePath}`);
      return fail("ASSETS_MISSING", "assets.json introuvable", 500);
    }

    const raw = fs.readFileSync(filePath, "utf8");

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.log(`[scan] ERROR invalid JSON`);
      return fail("ASSETS_INVALID_JSON", "assets.json invalide", 500);
    }

    // Ton fichier peut être { assets: [...] } ou directement [...]
    const assets = Array.isArray(parsed) ? parsed : (parsed.assets || []);

    if (!Array.isArray(assets)) {
      console.log(`[scan] ERROR assets not array`);
      return fail("ASSETS_BAD_FORMAT", "Format assets incorrect", 500);
    }

    // 3) cache set
    setCache(assets);

    console.log(`[scan] MISS ${assets.length} items (${now() - t0}ms)`);
    return ok(assets);

  } catch (e) {
    console.log(`[scan] FATAL`, e?.message || e);
    return fail("SCAN_FAILED", e?.message || "Erreur serveur", 500);
  }
}
