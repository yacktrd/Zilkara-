// lib/xyvala/snapshot.ts
/* XYVALA — Snapshot Cache (V3 stabilisé)
   Rôle :
   - source centrale de vérité cache pour scan / zones / decision
   - shape stable, réutilisable et vérifiable
   - in-memory best-effort borné
   - rétrocompatibilité douce avec anciens appels setToCache(..., ttlMs)
   - prêt pour migration vers Redis / KV sans casser l’API
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

  binance_url: string;
  affiliate_url: string;

  market_cap: number | null;
  volume_24h: number | null;

  score_delta: number | null;
  score_trend: ScoreTrend;
};

export type ScanContext = {
  market_regime: Regime | null;
  stable_ratio: number | null;
  transition_ratio: number | null;
  volatile_ratio: number | null;
};

export type ScanSnapshot = {
  ok: true;
  ts: string;
  version: string;
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

type Entry<T> = {
  ts: number;
  value: T;
  expiresAt: number | null;
};

const MAX_CACHE_ENTRIES = 500;

const mem = new Map<string, Entry<unknown>>();

function safeStr(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeFiniteNumberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeKeyPart(value: string | number | null | undefined): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return "";
}

function normalizeTtlMs(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const ttl = Math.max(0, Math.trunc(value));
  return ttl > 0 ? ttl : null;
}

function pruneCacheIfNeeded(): void {
  if (mem.size < MAX_CACHE_ENTRIES) return;

  const firstKey = mem.keys().next().value;
  if (typeof firstKey === "string") {
    mem.delete(firstKey);
  }
}

function buildKey(
  ns: string,
  parts: Record<string, string | number | null | undefined>
): string {
  const flat = Object.entries(parts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${normalizeKeyPart(v)}`)
    .join("&");

  return `xyvala:${ns}:${flat}`;
}

function isExpired(entry: Entry<unknown>, ttlMs: number): boolean {
  const now = Date.now();

  if (entry.expiresAt !== null && now >= entry.expiresAt) {
    return true;
  }

  if (ttlMs <= 0) {
    return true;
  }

  return now - entry.ts > ttlMs;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isScanAsset(value: unknown): value is ScanAsset {
  if (!isRecord(value)) return false;

  if (!safeStr(value.id)) return false;
  if (!safeStr(value.symbol)) return false;
  if (!safeStr(value.name)) return false;
  if (!safeStr(value.binance_url)) return false;
  if (!safeStr(value.affiliate_url)) return false;

  const scoreTrend = value.score_trend;
  if (scoreTrend !== "up" && scoreTrend !== "down" && scoreTrend !== null) {
    return false;
  }

  if (safeFiniteNumberOrNull(value.price) === null && value.price !== null) {
    return false;
  }

  if (safeFiniteNumberOrNull(value.chg_24h_pct) === null && value.chg_24h_pct !== null) {
    return false;
  }

  if (
    safeFiniteNumberOrNull(value.confidence_score) === null &&
    value.confidence_score !== null
  ) {
    return false;
  }

  if (safeFiniteNumberOrNull(value.market_cap) === null && value.market_cap !== null) {
    return false;
  }

  if (safeFiniteNumberOrNull(value.volume_24h) === null && value.volume_24h !== null) {
    return false;
  }

  if (safeFiniteNumberOrNull(value.score_delta) === null && value.score_delta !== null) {
    return false;
  }

  return true;
}

export function getFromCache<T>(k: string, ttlMs: number): T | null {
  const entry = mem.get(k);
  if (!entry) return null;

  const effectiveTtl = Number.isFinite(ttlMs) ? Math.max(0, Math.trunc(ttlMs)) : 0;

  if (isExpired(entry, effectiveTtl)) {
    mem.delete(k);
    return null;
  }

  return entry.value as T;
}

export function setToCache<T>(k: string, value: T, ttlMs?: number): void {
  pruneCacheIfNeeded();

  const normalizedTtl = normalizeTtlMs(ttlMs);

  mem.set(k, {
    ts: Date.now(),
    value,
    expiresAt: normalizedTtl !== null ? Date.now() + normalizedTtl : null,
  });
}

export function clearSnapshotCache(): void {
  mem.clear();
}

export function getSnapshotCacheSize(): number {
  return mem.size;
}

export function scanKey(opts: {
  version: string;
  market: string;
  quote: string;
  sort: "score" | "price";
  order: "asc" | "desc";
  limit: number;
  q: string | null;
}): string {
  return buildKey("scan", {
    v: opts.version,
    market: opts.market,
    quote: opts.quote,
    sort: opts.sort,
    order: opts.order,
    limit: opts.limit,
    q: opts.q ?? "",
  });
}

export function zonesKey(opts: {
  version: string;
  scan_cache_key: string;
  symbol: string;
  tf: string;
}): string {
  return buildKey("zones", {
    v: opts.version,
    scan: opts.scan_cache_key,
    symbol: opts.symbol,
    tf: opts.tf,
  });
}

export function decisionKey(opts: {
  version: string;
  zones_cache_key: string;
  symbol: string;
  tf: string;
}): string {
  return buildKey("decision", {
    v: opts.version,
    zones: opts.zones_cache_key,
    symbol: opts.symbol,
    tf: opts.tf,
  });
}

/**
 * Validation minimale pour sécuriser les routes qui réutilisent le snapshot.
 * Objectif :
 * - bloquer les formes cassées les plus probables
 * - rester légère
 */
export function isScanSnapshot(value: unknown): value is ScanSnapshot {
  if (!isRecord(value)) {
    return false;
  }

  const snapshot = value as Partial<ScanSnapshot>;

  if (snapshot.ok !== true) return false;
  if (!safeStr(snapshot.ts)) return false;
  if (!safeStr(snapshot.version)) return false;

  if (
    snapshot.source !== "scan" &&
    snapshot.source !== "fallback" &&
    snapshot.source !== "cache"
  ) {
    return false;
  }

  if (!Array.isArray(snapshot.data)) return false;
  if (!snapshot.data.every(isScanAsset)) return false;

  if (!isRecord(snapshot.meta)) return false;
  if (!isRecord(snapshot.context)) return false;

  const meta = snapshot.meta;
  const context = snapshot.context;

  if (meta.sort !== "score" && meta.sort !== "price") {
    return false;
  }

  if (meta.order !== "asc" && meta.order !== "desc") {
    return false;
  }

  if (
    safeFiniteNumberOrNull(snapshot.count) === null ||
    safeFiniteNumberOrNull(meta.limit) === null
  ) {
    return false;
  }

  if (!Array.isArray(meta.warnings) || meta.warnings.some((item) => typeof item !== "string")) {
    return false;
  }

  if (
    safeFiniteNumberOrNull(context.stable_ratio) === null &&
    context.stable_ratio !== null
  ) {
    return false;
  }

  if (
    safeFiniteNumberOrNull(context.transition_ratio) === null &&
    context.transition_ratio !== null
  ) {
    return false;
  }

  if (
    safeFiniteNumberOrNull(context.volatile_ratio) === null &&
    context.volatile_ratio !== null
  ) {
    return false;
  }

  const marketRegime = context.market_regime;
  if (
    typeof marketRegime !== "string" &&
    marketRegime !== null &&
    marketRegime !== undefined
  ) {
    return false;
  }

  return true;
}
