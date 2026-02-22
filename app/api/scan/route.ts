// app/api/scan/route.ts
import { NextResponse } from "next/server";

/**
 * Zilkara — /api/scan (V2)
 * ADN demandé :
 * - Scanner simple : liste d'actifs triés par confidence_score (décroissant)
 * - Ajout du nom complet (name) propre + robuste
 * - Binance non fiable côté serveur => source CoinGecko, lien Binance = optionnel (best-effort)
 * - Paramètres de filtre via querystring (ergonomique côté UI) (optionnels)
 *
 * V2 = recalibration "différenciante" :
 * - pénalise les mouvements trop faibles (stablecoins / no-op)
 * - pénalise les chocs extrêmes
 * - bonus "zone exploitable" + liquidité
 * - bonus/malus de cohérence 7j (interne, pas exposé si tu ne veux pas)
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ----------------------------- Types ----------------------------- */

type Regime = "STABLE" | "TRANSITION" | "VOLATILE";
type ConfidenceLabel = "GOOD" | "MID" | "BAD";

type ApiError = { code: string; message: string };

export type ScanAsset = {
  id?: string; // CoinGecko id
  symbol: string; // BTC
  name: string; // Bitcoin
  price: number; // prix spot (USD)
  chg_24h_pct: number; // % 24h
  stability_score: number; // compat UI (inchangé)
  regime: Regime;

  // Score principal (sert au tri)
  confidence_score: number; // 0..100
  confidence_label: ConfidenceLabel;
  confidence_reason: string;

  // best-effort (peut être null)
  binance_url: string | null;

  // debug optionnel (tu peux laisser, l’UI l’ignore)
  delta_score?: number;
  regime_change?: boolean;
};

export type ScanResponse = {
  ok: boolean;
  ts: number;
  source: "coingecko";
  market: "spot";
  quote: string;
  count: number;
  data: ScanAsset[];
  meta?: Record<string, unknown>;
  error?: ApiError;
};

/* ----------------------------- Config ---------------------------- */

const DEFAULT_LIMIT = 250;
const QUOTE = "usd";
const SNAPSHOT_CACHE_TTL_S = 20;

// Régimes simples (stables et explicables)
const REGIME_STABLE_MAX_ABS = 5; // <= 5% => STABLE
const REGIME_TRANSITION_MAX_ABS = 12; // <= 12% => TRANSITION, sinon VOLATILE

/* ----------------------------- Cache ----------------------------- */

declare global {
  // eslint-disable-next-line no-var
  var __ZILKARA_MEM_CACHE__:
    | { key: string; ts: number; payload: ScanResponse }
    | undefined;
}

async function kvGet<T>(key: string): Promise<T | null> {
  try {
    const mod = await import("@vercel/kv");
    const kv = mod.kv;
    if (!kv) return null;
    return (await kv.get<T>(key)) ?? null;
  } catch {
    return null;
  }
}

async function kvSet<T>(key: string, value: T, ttlSeconds: number) {
  try {
    const mod = await import("@vercel/kv");
    const kv = mod.kv;
    if (!kv) return;
    await kv.set(key, value, { ex: ttlSeconds });
  } catch {
    // noop
  }
}

/* ----------------------------- Helpers --------------------------- */

function clamp(n: number, a: number, b: number) {
  if (!Number.isFinite(n)) return a;
  return Math.max(a, Math.min(b, n));
}

function safeNumber(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function safeString(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v.trim();
  if (v == null) return fallback;
  return String(v).trim();
}

function regimeFromAbsMove(absPct: number): Regime {
  if (absPct <= REGIME_STABLE_MAX_ABS) return "STABLE";
  if (absPct <= REGIME_TRANSITION_MAX_ABS) return "TRANSITION";
  return "VOLATILE";
}

/**
 * stability_score (compat UI)
 * On le garde simple et stable.
 */
function computeStabilityScore(chg24: number): number {
  const abs = Math.abs(chg24);
  // 0% => 100 ; 20% => ~0
  return clamp(100 - abs * 5, 0, 100);
}

function labelFromScore(score: number): ConfidenceLabel {
  if (score >= 75) return "GOOD";
  if (score >= 55) return "MID";
  return "BAD";
}

/**
 * Binance peut bloquer: on renvoie un lien “best-effort” ou null.
 * (Ne pas dépendre de Binance pour remplir le scan.)
 */
function buildBinanceUrl(symbol: string, quote = "USDT"): string | null {
  const s = symbol.trim().toUpperCase();
  if (!s) return null;
  return `https://www.binance.com/en/trade/${s}${quote.toUpperCase()}`;
}

/* ----------------------- Confidence Score V2 ---------------------- */
/**
 * Objectif V2 (différenciant + attractif):
 * - Ne PAS sur-valoriser l’immobilité (stablecoins/no-op)
 * - Favoriser une zone "exploitable" (mouvement modéré) + liquidité
 * - Pénaliser les chocs (bruit/risque contextuel)
 * - Ajouter une cohérence 7j (si dispo) pour éviter les "bons" scores purement 24h
 *
 * Important: on reste non-propriétaire (pas de détails RFS internes).
 */
function computeConfidenceScoreV2(args: {
  chg24: number;
  chg7d?: number | null;
  volume24h: number;
  marketCap: number;
  name: string;
}): { score: number; reason: string } {
  const chg24 = safeNumber(args.chg24, 0);
  const abs24 = Math.abs(chg24);

  const chg7d = args.chg7d == null ? null : safeNumber(args.chg7d, 0);
  const abs7 = chg7d == null ? null : Math.abs(chg7d);

  // 1) Base stabilité (pas trop agressive)
  // 0% => 92 ; 10% => 52 ; 20% => 12
  const base = clamp(92 - abs24 * 4, 0, 92);

  // 2) Bonus zone exploitable (cloche simple)
  // Centre ~2.5% ; au-delà ça retombe.
  // 0..14
  const center = 2.5;
  const width = 2.5;
  const z = (abs24 - center) / width;
  const opportunityBonus = clamp(Math.round(14 * Math.exp(-z * z)), 0, 14);

  // 3) Bonus liquidité (log scale robuste)
  // 0..20
  const vol = Math.max(0, safeNumber(args.volume24h, 0));
  const mcap = Math.max(0, safeNumber(args.marketCap, 0));
  const liqRaw = Math.log10(1 + vol) + 0.5 * Math.log10(1 + mcap);
  const liquidityBonus = clamp((liqRaw - 6) * 4, 0, 20);

  // 4) Pénalités
  // 4a) Dead-zone (mouvement quasi nul) => stablecoins/no-op
  // si <0.30% => -22 (c’est le levier qui enlève les stablecoins du top)
  const deadPenalty = abs24 < 0.3 ? 22 : 0;

  // 4b) Shock penalty si mouvement extrême
  // au-delà de 12% => pénalité croissante 0..30
  const shockPenalty = clamp((abs24 - 12) * 2.5, 0, 30);

  // 5) Cohérence 7j (si dispo)
  // +8 si 24h et 7j vont dans le même sens ET 7j pas extrême
  // -8 si contradiction
  let coherenceAdj = 0;
  if (chg7d != null && abs7 != null) {
    const sameSign = (chg24 >= 0 && chg7d >= 0) || (chg24 < 0 && chg7d < 0);
    if (sameSign && abs7 >= 1 && abs7 <= 18) coherenceAdj = 8;
    if (!sameSign && abs7 >= 1) coherenceAdj = -8;
  }

  // 6) Score final
  const rawScore =
    base +
    opportunityBonus +
    liquidityBonus +
    coherenceAdj -
    deadPenalty -
    shockPenalty;

  const score = clamp(Math.round(rawScore), 0, 100);

  // Reason (1 phrase, utile, sans bruit)
  // On explique le *pourquoi du ranking*.
  let reason = "Confiance calibrée: liquidité + zone exploitable + stabilité 24h.";
  if (deadPenalty > 0) reason = "Mouvement trop faible: peu exploitable (confiance réduite).";
  else if (shockPenalty >= 15) reason = "Choc élevé: contexte bruité (prudence).";
  else if (abs24 >= 1 && abs24 <= 6) reason = "Mouvement modéré + liquidité: sélection favorable.";
  else if (abs24 > 6 && abs24 <= 12) reason = "Volatilité en transition: filtrer selon objectif.";

  // Petite nuance cohérence si dispo (sans surcharge)
  if (coherenceAdj === 8) reason += " Cohérence 7j positive.";
  if (coherenceAdj === -8) reason += " Divergence 7j: prudence.";

  // Dernier garde-fou: si ça ressemble à un stablecoin par le nom
  // (sans blacklist, juste une micro pénalité si mouvement faible)
  const name = (args.name || "").toLowerCase();
  const looksStable =
    name.includes("usd") || name.includes("dollar") || name.includes("eur") || name.includes("stable");
  if (looksStable && abs24 < 0.6) {
    // Ajuste légèrement si le deadPenalty n’a pas déclenché
    return {
      score: clamp(score - 8, 0, 100),
      reason: "Actif très stable / peu exploitable (confiance réduite).",
    };
  }

  return { score, reason };
}

/* -------------------------- CoinGecko ---------------------------- */

type CoinGeckoMarket = {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number | null;

  // IMPORTANT: CoinGecko renvoie ce champ si on demande price_change_percentage=7d
  price_change_percentage_7d_in_currency?: number | null;

  total_volume: number | null;
  market_cap: number | null;
};

async function fetchCoinGecko(signal: AbortSignal, limit: number): Promise<CoinGeckoMarket[]> {
  const perPage = clamp(limit, 1, 250);

  // On demande 24h + 7d pour la cohérence V2 (sans exposer 7d à l’UI).
  const url =
    `https://api.coingecko.com/api/v3/coins/markets` +
    `?vs_currency=${encodeURIComponent(QUOTE)}` +
    `&order=volume_desc` +
    `&per_page=${perPage}` +
    `&page=1` +
    `&sparkline=false` +
    `&price_change_percentage=24h,7d`;

  const res = await fetch(url, {
    method: "GET",
    signal,
    headers: {
      accept: "application/json",
      ...(process.env.COINGECKO_API_KEY
        ? { "x-cg-demo-api-key": process.env.COINGECKO_API_KEY }
        : {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`COINGECKO_HTTP_${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as unknown;
  return Array.isArray(data) ? (data as CoinGeckoMarket[]) : [];
}

/* ----------------------------- Route ----------------------------- */

export async function GET(req: Request) {
  const ts = Date.now();
  const { searchParams } = new URL(req.url);

  // Paramètres “scanner” (optionnels, pas de filtre visuel côté UI si tu ne l’affiches pas)
  const limit = clamp(safeNumber(searchParams.get("limit"), DEFAULT_LIMIT), 1, 250);
  const minScore = clamp(safeNumber(searchParams.get("minScore"), 0), 0, 100);

  // regime=STABLE|TRANSITION|VOLATILE|ALL
  const regimeParam = (searchParams.get("regime") || "ALL").toUpperCase();
  const regimeFilter: Regime | "ALL" =
    regimeParam === "STABLE" || regimeParam === "TRANSITION" || regimeParam === "VOLATILE"
      ? (regimeParam as Regime)
      : "ALL";

  // discipline=1 => coupe une partie des “VOLATILE” faibles
  const discipline = searchParams.get("discipline") === "1";

  const cacheKey = `zilkara:scan:v2:${limit}:${minScore}:${regimeFilter}:${discipline ? 1 : 0}`;

  // KV cache
  const kvCached = await kvGet<ScanResponse>(cacheKey);
  if (kvCached?.ok && Array.isArray(kvCached.data)) {
    return NextResponse.json(kvCached, { status: 200 });
  }

  // mémoire cache
  const mem = globalThis.__ZILKARA_MEM_CACHE__;
  if (mem && mem.key === cacheKey && ts - mem.ts < SNAPSHOT_CACHE_TTL_S * 1000 && mem.payload.ok) {
    return NextResponse.json(mem.payload, { status: 200 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let raw: CoinGeckoMarket[] = [];
    try {
      raw = await fetchCoinGecko(controller.signal, limit);
    } finally {
      clearTimeout(timeout);
    }

    const mapped: ScanAsset[] = raw
      .map((coin) => {
        const id = safeString(coin.id);
        const symbol = safeString(coin.symbol).toUpperCase();
        const name = safeString(coin.name);

        const price = safeNumber(coin.current_price, 0);
        const chg24 = safeNumber(coin.price_change_percentage_24h, 0);
        const chg7d = coin.price_change_percentage_7d_in_currency ?? null;

        // garde-fous
        if (!symbol || !name) return null;
        if (!Number.isFinite(price) || price <= 0) return null;

        const abs24 = Math.abs(chg24);
        const regime = regimeFromAbsMove(abs24);
        const stability_score = Math.round(computeStabilityScore(chg24));

        const volume24h = safeNumber(coin.total_volume, 0);
        const marketCap = safeNumber(coin.market_cap, 0);

        // V2 score
        const conf = computeConfidenceScoreV2({
          chg24,
          chg7d,
          volume24h,
          marketCap,
          name,
        });

        const confidence_score = Math.round(conf.score);
        const confidence_label = labelFromScore(confidence_score);

        return {
          id,
          symbol,
          name,
          price,
          chg_24h_pct: Math.round(chg24 * 100) / 100,
          stability_score,
          regime,
          confidence_score,
          confidence_label,
          confidence_reason: conf.reason,
          binance_url: buildBinanceUrl(symbol, "USDT"),
        } satisfies ScanAsset;
      })
      .filter((x): x is ScanAsset => Boolean(x));

    // 1) score minimum
    let filtered = mapped.filter((a) => a.confidence_score >= minScore);

    // 2) régime
    if (regimeFilter !== "ALL") {
      filtered = filtered.filter((a) => a.regime === regimeFilter);
    }

    // 3) discipline
    if (discipline) {
      filtered = filtered.filter((a) => a.regime !== "VOLATILE" || a.confidence_score >= 70);
    }

    // TRI: confidence_score desc (ADN scanner)
    filtered.sort((a, b) => {
      if (b.confidence_score !== a.confidence_score) return b.confidence_score - a.confidence_score;
      if (b.stability_score !== a.stability_score) return b.stability_score - a.stability_score;
      return Math.abs(a.chg_24h_pct) - Math.abs(b.chg_24h_pct);
    });

    const payload: ScanResponse = {
      ok: true,
      ts,
      source: "coingecko",
      market: "spot",
      quote: QUOTE.toUpperCase(),
      count: filtered.length,
      data: filtered.slice(0, limit),
      meta: {
        version: "v2",
        minScore,
        regime: regimeFilter,
        discipline,
        sort: "confidence_score_desc",
      },
    };

    await kvSet(cacheKey, payload, SNAPSHOT_CACHE_TTL_S);

    globalThis.__ZILKARA_MEM_CACHE__ = {
      key: cacheKey,
      ts,
      payload,
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    const payload: ScanResponse = {
      ok: false,
      ts,
      source: "coingecko",
      market: "spot",
      quote: QUOTE.toUpperCase(),
      count: 0,
      data: [],
      error: { code: "SCAN_FAILED", message },
    };

    return NextResponse.json(payload, { status: 500 });
  }
}
