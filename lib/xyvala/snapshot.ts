// lib/xyvala/snapshot.ts
/**
 * XYVALA — Snapshot Cache (V1 propre, robuste, prêt V2 KV)
 *
 * ADN :
 * - Un “capteur” stable (scan) réutilisable par /zones et /decision
 * - Shape immuable (pas de surprises pour l’UI)
 * - Cache best-effort (serverless) + contrat identique si on passe à Vercel KV
 *
 * Corrections / améliorations vs erreurs vues :
 * - Clés stables & canoniques (tri des params) => moins de "cache miss" inutiles
 * - TTL géré au niveau entry (expiresAt) => lecture O(1), logique claire
 * - Auto-clean périodique => limite la croissance mémoire
 * - API async-compatible (get/set peuvent devenir KV sans casser les appels)
 */

export type Market = "crypto" | string;
export type Quote = "usd" | "usdt" | "eur" | string;

export type Regime = "STABLE" | "TRANSITION" | "VOLATILE" | string;
export type ScoreTrend = "up" | "down" | null;

export type ScanAsset = {
  id: string;
  symbol: string;
  name: string;

  price: number | null;
  chg_24h_pct: number | null;

  confidence_score: number | null;
  regime: Regime | null;

  // jamais vides côté API (fallback => markets/binance)
  binance_url: string;
  affiliate_url: string;

  market_cap: number | null;
  volume_24h: number | null;

  score_delta: number | null;
  score_trend: ScoreTrend;
};

export type ScanContext = {
  market_regime: Regime;
  stable_ratio: number;
  transition_ratio: number;
  volatile_ratio: number;
};

export type ScanSnapshot = {
  ok: true;
  ts: string; // ISO
  version: string; // ex: "v1"
  source: "scan" | "fallback" | "cache";

  market: Market;
  quote: Quote;

  count: number;
  data: ScanAsset[];

  context: ScanContext;

  meta: {
    limit: number;
    sort: "score" | "price";
    order: "asc" | "desc";
    q: string | null;
    warnings: string[];
  };
};

/* ------------------------------ Cache engine ------------------------------ */

type Entry<T> = {
  value: T;
  createdAt: number; // epoch ms
  expiresAt: number; // epoch ms
};

const mem = new Map<string, Entry<unknown>>();

// Petite GC périodique (best-effort) pour éviter que la Map grossisse indéfiniment.
let lastGcAt = 0;
const GC_INTERVAL_MS = 30_000; // toutes les 30s max
const MAX_ENTRIES = 1500; // garde-fou (serverless)
const HARD_EVICT_BATCH = 200;

function now() {
  return Date.now();
}

function maybeGc() {
  const t = now();
  if (t - lastGcAt < GC_INTERVAL_MS) return;
  lastGcAt = t;

  // 1) purge expirés
  for (const [k, e] of mem.entries()) {
    if (e.expiresAt <= t) mem.delete(k);
  }

  // 2) garde-fou taille : éviction simple (les plus vieux) si on dépasse MAX_ENTRIES
  if (mem.size <= MAX_ENTRIES) return;

  const arr: Array<[string, Entry<unknown>]> = [];
  for (const kv of mem.entries()) arr.push(kv);

  arr.sort((a, b) => a[1].createdAt - b[1].createdAt); // plus ancien d’abord
  const toRemove = Math.min(mem.size - MAX_ENTRIES, HARD_EVICT_BATCH);

  for (let i = 0; i < toRemove; i++) mem.delete(arr[i][0]);
}

function stableEncode(v: string | number | boolean | null | undefined) {
  if (v === null || v === undefined) return "";
  return encodeURIComponent(String(v));
}

// Canonicalisation : tri des clés => clé stable quel que soit l’ordre d’insertion.
function key(ns: string, parts: Record<string, string | number | boolean | null | undefined>) {
  const keys = Object.keys(parts).sort();
  const flat = keys.map((k) => `${k}=${stableEncode(parts[k])}`).join("&");
  return `xyvala:${ns}:${flat}`;
}

/**
 * API compatible V2 KV :
 * - getFromCache / setToCache sont async-friendly (tu peux les await sans changer d’implémentation)
 * - si tu passes à KV, tu gardes les mêmes signatures.
 */
export async function getFromCache<T>(k: string, ttlMs: number): Promise<T | null> {
  maybeGc();

  const e = mem.get(k) as Entry<T> | undefined;
  if (!e) return null;

  const t = now();

  // TTL "soft" demandé par l'appelant (permet de raccourcir selon endpoint)
  // + TTL "hard" enregistré à l'écriture (expiresAt).
  const age = t - e.createdAt;
  if (age > ttlMs || e.expiresAt <= t) {
    mem.delete(k);
    return null;
  }

  return e.value;
}

export async function setToCache<T>(k: string, value: T, ttlMs = 45_000): Promise<void> {
  maybeGc();

  const t = now();
  mem.set(k, {
    value,
    createdAt: t,
    expiresAt: t + Math.max(1_000, ttlMs), // min 1s pour éviter edge-cases
  });
}

/* --------------------------------- Keys ---------------------------------- */

/** Snapshot keys (scan canonical) */
export function scanKey(opts: {
  version: string;
  market: string;
  quote: string;
  sort: "score" | "price";
  order: "asc" | "desc";
  limit: number;
  q: string | null;
}) {
  return key("scan", {
    v: opts.version,
    market: opts.market,
    quote: opts.quote,
    sort: opts.sort,
    order: opts.order,
    limit: opts.limit,
    q: opts.q ?? "",
  });
}

/** Zones keys depend on scanKey (composition stable) */
export function zonesKey(opts: {
  version: string;
  scan_cache_key: string;
  symbol: string;
  tf: string;
}) {
  return key("zones", {
    v: opts.version,
    scan: opts.scan_cache_key,
    symbol: opts.symbol,
    tf: opts.tf,
  });
}

/** Decision keys depend on zonesKey */
export function decisionKey(opts: {
  version: string;
  zones_cache_key: string;
  symbol: string;
  tf: string;
}) {
  return key("decision", {
    v: opts.version,
    zones: opts.zones_cache_key,
    symbol: opts.symbol,
    tf: opts.tf,
  });
}

/* ------------------------------ Debug helpers ----------------------------- */
/** Optionnel : utile en dev pour vérifier que le cache fonctionne */
export function __cacheStats() {
  maybeGc();
  return { size: mem.size, lastGcAt };
}
