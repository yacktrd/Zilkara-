  // Petite sécurité : si symbol absent, on tente id
  if (!asset.symbol && asset.id) asset.symbol = asset.id.toUpperCase();

  return asset;
}

/**
 * 🔌 BRANCHE ICI ton pipeline actuel
 * - soit tu lis depuis KV / fichier / DB
 * - soit tu appelles ton “engine”
 *
 * Doit retourner un tableau brut (any[]), ensuite normalisé.
 */
async function getRawUniverse(): Promise<any[]> {
  // ✅ Par défaut, on ne casse jamais le build : retourne [] si rien.
  // Remplace cette partie par ton vrai générateur.
  return [];
}

function sortAssets(data: ScanAsset[], sortKey: string): ScanAsset[] {
  const copy = [...data];

  if (sortKey === 'price_asc') {
    copy.sort((a, b) => (a.price ?? -Infinity) - (b.price ?? -Infinity));
    return copy;
  }
  if (sortKey === 'price_desc') {
    copy.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
    return copy;
  }
  if (sortKey === 'score_asc') {
    copy.sort((a, b) => (a.confidence_score ?? -Infinity) - (b.confidence_score ?? -Infinity));
    return copy;
  }

  // default: score desc
  copy.sort((a, b) => (b.confidence_score ?? -Infinity) - (a.confidence_score ?? -Infinity));
  return copy;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = parseIntSafe(url.searchParams.get('limit'), 200, 1, 500);

  // ✅ tes filtres actuels: Prix/Score asc/desc
  const sort = asNullableString(url.searchParams.get('sort')) ?? 'score_desc';

  try {
    const raw = await getRawUniverse();
    const normalized = (Array.isArray(raw) ? raw : []).map(normalizeAsset);

    const sorted = sortAssets(normalized, sort);

    const sliced = sorted.slice(0, limit);

    const res: ScanResponse = {
      ok: true,
      ts: new Date().toISOString(),
      source: 'scan',
      market: 'crypto',
      quote: 'USD',
      count: sliced.length,
      data: sliced,
    };

    return NextResponse.json(res, { status: 200 });
  } catch (e: any) {
    const res: ScanResponse = {
      ok: false,
      ts: new Date().toISOString(),
      source: 'scan',
      market: 'crypto',
      quote: 'USD',
      count: 0,
      data: [],
      error: e?.message ? String(e.message) : 'Scan failed',
    };

    return NextResponse.json(res, { status: 500 });
  }
}
