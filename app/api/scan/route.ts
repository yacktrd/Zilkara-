// app/api/scan/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs"; // ou "edge" si ton code est compatible

type Regime = "STABLE" | "TRANSITION" | "VOLATILE" | string;

type ScanAsset = {
  id: string;
  symbol: string;
  name: string;

  // lecture H24
  timeframe: "H24";
  price: number | null;
  chg_24h_pct: number | null;

  // score
  confidence_score: number | null; // 0-100
  regime: Regime;

  // deltas optionnels (si tu as une base historique)
  score_delta: number | null;
  score_trend: "up" | "down" | "flat" | null;

  // liens (NE JAMAIS reconstruire côté UI)
  binance_url: string | null;
  affiliate_url: string | null;

  // optionnels
  market_cap: number | null;
  volume_24h: number | null;
};

type ScanResponse = {
  ok: boolean;
  ts: string;
  count: number;
  data: ScanAsset[];
  error?: string;
  message?: string;
};

// ---------------------------
// Helpers (0 undefined)
// ---------------------------
function safeString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
}

function safeNumber(v: unknown): number | null {
  if (typeof v !== "number") return null;
  if (!Number.isFinite(v)) return null;
  return v;
}

function clampInt(n: number, min: number, max: number) {
  const x = Math.trunc(n);
  return Math.max(min, Math.min(max, x));
}

function normalizeSymbol(v: unknown): string | null {
  const s = safeString(v);
  if (!s) return null;
  // nettoie: garde lettres/chiffres/._- et upper
  const cleaned = s.replace(/[^a-zA-Z0-9._-]/g, "").toUpperCase();
  return cleaned.length ? cleaned : null;
}

function toRegime(v: unknown): Regime {
  const s = safeString(v);
  if (!s) return "STABLE";
  const u = s.toUpperCase();
  if (u === "STABLE" || u === "TRANSITION" || u === "VOLATILE") return u;
  return u; // fallback string
}

function parseSort(v: string | null): "score_desc" | "score_asc" | "price_desc" | "price_asc" {
  if (!v) return "score_desc";
  const s = v.toLowerCase();
  if (s === "score_asc") return "score_asc";
  if (s === "price_desc") return "price_desc";
  if (s === "price_asc") return "price_asc";
  return "score_desc";
}

function sortAssets(list: ScanAsset[], sort: ReturnType<typeof parseSort>) {
  const byScore = (a: ScanAsset) => (a.confidence_score ?? -1);
  const byPrice = (a: ScanAsset) => (a.price ?? -1);

  if (sort === "score_asc") return list.sort((a, b) => byScore(a) - byScore(b));
  if (sort === "price_desc") return list.sort((a, b) => byPrice(b) - byPrice(a));
  if (sort === "price_asc") return list.sort((a, b) => byPrice(a) - byPrice(b));
  return list.sort((a, b) => byScore(b) - byScore(a));
}

// ---------------------------
// Source des données
// ⚠️ Remplace ce fetch par TON pipeline réel
// (KV, CoinGecko, Binance, etc.)
// ---------------------------
async function getRawUniverse(): Promise<any[]> {
  // Exemple: si tu as déjà un endpoint interne / fichier / KV.
  // Ici, on renvoie [] par défaut pour éviter de casser le build.
  return [];
}

// ---------------------------
// Route
// ---------------------------
export async function GET(req: Request) {
  const url = new URL(req.url);

  const limitParam = safeString(url.searchParams.get("limit"));
  const sortParam = safeString(url.searchParams.get("sort"));

  const limit = clampInt(Number(limitParam ?? "250"), 1, 1000);
  const sort = parseSort(sortParam);

  try {
    const raw = await getRawUniverse();

    // NORMALIZE -> 0 undefined -> filtrage des null
    const normalized: ScanAsset[] = raw
      .map((x): ScanAsset | null => {
        const symbol = normalizeSymbol(x?.symbol);
        if (!symbol) return null;

        const id = safeString(x?.id) ?? symbol;
        const name = safeString(x?.name) ?? symbol;

        const confidenceScore = safeNumber(x?.confidence_score);
        const confidence_score = confidenceScore !== null ? clampInt(confidenceScore, 0, 100) : null;

        // Si tu as une base historique : calcule score_delta ici.
        // Sinon: null (propre, TS-safe)
        const score_delta = safeNumber(x?.score_delta);
        const scoreDelta = score_delta !== null ? Math.trunc(score_delta) : null;

        let score_trend: ScanAsset["score_trend"] = null;
        if (scoreDelta !== null) {
          if (scoreDelta > 0) score_trend = "up";
          else if (scoreDelta < 0) score_trend = "down";
          else score_trend = "flat";
        }

        return {
          id,
          symbol,
          name,

          timeframe: "H24",
          price: safeNumber(x?.price),
          chg_24h_pct: safeNumber(x?.chg_24h_pct),

          confidence_score,
          regime: toRegime(x?.regime),

          score_delta: scoreDelta,
          score_trend,

          // IMPORTANT: jamais undefined
          binance_url: safeString(x?.binance_url) ?? null,
          affiliate_url: safeString(x?.affiliate_url) ?? null,

          market_cap: safeNumber(x?.market_cap),
          volume_24h: safeNumber(x?.volume_24h),
        };
      })
      .filter((a): a is ScanAsset => a !== null);

    // tri
    sortAssets(normalized, sort);

    // limit (côté backend seulement)
    const data = normalized.slice(0, limit);

    const res: ScanResponse = {
      ok: true,
      ts: new Date().toISOString(),
      count: data.length,
      data,
    };

    return NextResponse.json(res, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    const res: ScanResponse = {
      ok: false,
      ts: new Date().toISOString(),
      count: 0,
      data: [],
      error: e?.message ? String(e.message) : "Erreur inconnue",
    };

    return NextResponse.json(res, {
      status: 500,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }
}
