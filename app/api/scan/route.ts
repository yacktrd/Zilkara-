// nano 
import { NextResponse } from "next/server";

export const runtime = "edge"; // rapide + stable sur Vercel

type ScanAsset = {
  symbol?: string; // ex: BTC
  name?: string; // ex: Bitcoin (optionnel)
  price?: number;

  chg_24h_pct?: number;
  chg_7d_pct?: number;
  chg_30d_pct?: number;

  stability_score?: number; // 0..100
  rating?: string; // A..E
  regime?: string; // STABLE | TRANSITION | VOLATILE

  binance_url?: string; // lien affilié si possible

  similarity?: number;
  rupture_rate?: number;
  reason?: string;
};

type ApiError = { code?: string; message?: string; hint?: string };

type ScanResponse = {
  ok: boolean;
  ts: number;
  source?: string;
  market?: string;
  quote?: string;
  count?: number;
  data: ScanAsset[];
  error?: ApiError;
};

/**
 * Erreurs fréquentes évitées ici :
 * - Retourner ok:true avec data:[] à cause d'un filtre trop strict
 * - Timeouts réseau non gérés → build OK mais prod vide
 * - Variables d'env manquantes (KV / affiliate) → crash silencieux
 * - Endpoint Binance trop lourd → on met cache + timeout
 * - Différences de schéma (asset vs symbol) → on normalise
 */

const QUOTE = "USDT";
const MARKET = "spot";
const SOURCE = "binance";
const CACHE_KEY = "zilkara:scan:v1";
const CACHE_TTL_SECONDS = 60; // 1 minute (invisible pour l’utilisateur + évite le spam Binance)
const LIMIT = 250; // tu affiches 250 actifs

// fallback cache en mémoire (si KV absent)
const mem = globalThis as unknown as { __zilkaraScanCache?: { ts: number; data: ScanAsset[] } };

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim().length ? v.trim() : undefined;
}

function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}

function toNum(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function isBadSymbol(sym: string) {
  // filtres légers (pas destructifs)
  const s = sym.toUpperCase();
  // évite certains produits “parasites” (tu peux ajuster ensuite)
  return (
    s.includes("UP" + QUOTE) ||
    s.includes("DOWN" + QUOTE) ||
    s.includes("BULL" + QUOTE) ||
    s.includes("BEAR" + QUOTE)
  );
}

function baseFromPair(pair: string, quote = QUOTE) {
  return pair.endsWith(quote) ? pair.slice(0, -quote.length) : pair;
}

function scoreFromAbsMove(absPct: number) {
  // plus ça bouge, moins c'est “stable”
  // absPct 0% => 100, absPct 10% => ~50, absPct 20% => ~0
  const score = 100 - absPct * 5;
  return clamp(Math.round(score), 0, 100);
}

function ratingFromScore(score: number) {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "E";
}

function regimeFromScore(score: number) {
  if (score >= 70) return "STABLE";
  if (score >= 45) return "TRANSITION";
  return "VOLATILE";
}

function affiliateBinanceUrl(base: string, quote: string) {
  // Affiliation : tu peux mettre ton code dans BINANCE_REF
  // Binance n’a pas un format unique universel, donc on fait simple :
  // - lien trade spot standard
  // - si ref dispo, on l’ajoute en query (support variable selon tracking, mais au minimum tu gardes ton param)
  const ref = env("BINANCE_REF") || env("NEXT_PUBLIC_BINANCE_REF") || env("BINANCE_AFFILIATE");
  const url = `https://www.binance.com/en/trade/${encodeURIComponent(base)}_${encodeURIComponent(quote)}?type=spot`;
  if (!ref) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}ref=${encodeURIComponent(ref)}`;
}

async function fetchJson(url: string, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "accept": "application/json",
        // évite certains caches intermédiaires
        "cache-control": "no-cache",
      },
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${res.statusText}${txt ? ` — ${txt.slice(0, 120)}` : ""}`);
    }
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

async function getKv() {
  // KV optionnel. Si @vercel/kv n’est pas installé ou env absentes, on retombe sur mem cache.
  try {
    const mod: any = await import("@vercel/kv");
    return mod?.kv ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const ts = Date.now();
  const url = new URL(req.url);

  const force = url.searchParams.get("force") === "1"; // bypass cache
  const debug = url.searchParams.get("debug") === "1"; // logs

  // 1) Cache KV si dispo
  const kv = await getKv();

  if (!force) {
    // KV cache
    if (kv) {
      try {
        const cached = (await kv.get(CACHE_KEY)) as { ts: number; data: ScanAsset[] } | null;
        if (cached?.ts && Array.isArray(cached.data)) {
          const ageSec = (Date.now() - cached.ts) / 1000;
          if (ageSec <= CACHE_TTL_SECONDS) {
            const out: ScanResponse = {
              ok: true,
              ts: cached.ts,
              source: SOURCE,
              market: MARKET,
              quote: QUOTE,
              count: cached.data.length,
              data: cached.data,
            };
            return NextResponse.json(out, { status: 200 });
          }
        }
      } catch {
        // on ignore le cache si KV a un souci
      }
    }

    // mem cache (fallback)
    const m = mem.__zilkaraScanCache;
    if (m?.ts && Array.isArray(m.data)) {
      const ageSec = (Date.now() - m.ts) / 1000;
      if (ageSec <= CACHE_TTL_SECONDS) {
        const out: ScanResponse = {
          ok: true,
          ts: m.ts,
          source: SOURCE,
          market: MARKET,
          quote: QUOTE,
          count: m.data.length,
          data: m.data,
        };
        return NextResponse.json(out, { status: 200 });
      }
    }
  }

  // 2) Fetch Binance 24h tickers
  // endpoint stable, pas besoin d’API key
  const BINANCE_24H = "https://api.binance.com/api/v3/ticker/24hr";

  try {
    const raw = await fetchJson(BINANCE_24H, 9000);

    if (!Array.isArray(raw)) {
      const out: ScanResponse = {
        ok: false,
        ts,
        data: [],
        error: {
          code: "BAD_SHAPE",
          message: "Réponse Binance inattendue (format).",
          hint: "Vérifie la disponibilité de /api/v3/ticker/24hr.",
        },
      };
      return NextResponse.json(out, { status: 502 });
    }

    // 3) Normalisation + filtres “non destructifs”
    const assets: ScanAsset[] = [];

    for (const r of raw) {
      const pair = String(r?.symbol ?? "").toUpperCase();
      if (!pair || !pair.endsWith(QUOTE)) continue;
      if (isBadSymbol(pair)) continue;

      const lastPrice = toNum(r?.lastPrice);
      const pct24 = toNum(r?.priceChangePercent); // Binance renvoie déjà en %
      if (lastPrice === undefined || pct24 === undefined) continue;

      const base = baseFromPair(pair, QUOTE);
      // garde permissif : on n’élimine PAS sur régime/score
      const abs = Math.abs(pct24);
      const stability = scoreFromAbsMove(abs);
      const rating = ratingFromScore(stability);
      const regime = regimeFromScore(stability);

      assets.push({
        symbol: base,
        name: base, // tu pourras brancher un mapping plus tard
        price: lastPrice,
        chg_24h_pct: pct24,
        // 7d/30d : optionnel (si tu veux les calculer via historique KV plus tard)
        chg_7d_pct: undefined,
        chg_30d_pct: undefined,
        stability_score: stability,
        rating,
        regime,
        binance_url: affiliateBinanceUrl(base, QUOTE),
      });
    }

    // 4) Tri + limit
    // Tu veux “Mouvements 24h” => tri sur abs(chg_24h_pct)
    assets.sort((a, b) => Math.abs((b.chg_24h_pct ?? 0) as number) - Math.abs((a.chg_24h_pct ?? 0) as number));
    const sliced = assets.slice(0, LIMIT);

    // 5) Cache write
    const payload = { ts: Date.now(), data: sliced };

    if (kv) {
      try {
        // certains KV supportent { ex: seconds }
        await kv.set(CACHE_KEY, payload, { ex: CACHE_TTL_SECONDS });
      } catch {
        // ignore
      }
    }
    mem.__zilkaraScanCache = payload;

    if (debug) {
      // edge logs visibles Vercel
      console.log("[scan] raw:", raw.length, "mapped:", assets.length, "returned:", sliced.length);
    }

    const out: ScanResponse = {
      ok: true,
      ts: payload.ts,
      source: SOURCE,
      market: MARKET,
      quote: QUOTE,
      count: sliced.length,
      data: sliced,
    };

    return NextResponse.json(out, { status: 200 });
  } catch (e: any) {
    const msg = String(e?.message || "Fetch failed");

    const out: ScanResponse = {
      ok: false,
      ts,
      data: [],
      error: {
        code: "FETCH_FAIL",
        message: "Impossible de récupérer les données marché.",
        hint: msg.slice(0, 180),
      },
    };

    return NextResponse.json(out, { status: 502 });
  }
}
