// lib/xyvala/memory.ts
/**
 * XYVALA — Memory Engine (V1)
 *
 * Objectif :
 * - enregistrer les décisions produites par le moteur
 * - garder une trace exploitable, stable et comparable
 * - préparer l'évaluation future des signaux
 *
 * ADN :
 * - capteur → contexte → RFS → décision
 * - mémoire = couche de retour d'expérience
 *
 * V1 :
 * - in-memory best-effort
 * - signatures async-friendly
 * - migration KV possible sans casser les appels
 */

export type MemoryAction = "ALLOW" | "WATCH" | "BLOCK";

export type MemoryExecutionMode =
  | "none"
  | "progressive"
  | "confirmation"
  | "reduced"
  | "dca_zone"
  | "confirm_retest"
  | "wait";

export type MemoryStatus = "open" | "resolved";

export type SignalMemoryRecord = {
  id: string;
  ts: string;

  symbol: string;
  tf: string;

  snapshot_hash: string | null;

  market_regime: string | null;

  best_zone_price: number | null;
  zone_score: number | null;

  action: MemoryAction;
  execution_mode: MemoryExecutionMode;

  observed_price_later: number | null;
  observed_result_pct: number | null;

  status: MemoryStatus;
};

type Entry<T> = {
  value: T;
  createdAt: number;
  updatedAt: number;
};

const mem = new Map<string, Entry<SignalMemoryRecord>>();
const indexBySymbol = new Map<string, string[]>();

const MAX_RECORDS = 10_000;
const GC_BATCH = 250;

/* -------------------------------- Utilities ------------------------------- */

function nowIso() {
  return new Date().toISOString();
}

function nowMs() {
  return Date.now();
}

function safeStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
}

function sanitizeSymbol(symbol: string) {
  return symbol.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
}

function sanitizeTf(tf: string) {
  return tf.trim().toUpperCase() || "1D";
}

function safeNum(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function makeId(input: {
  symbol: string;
  tf: string;
  ts: string;
}) {
  // ID lisible, stable, sans dépendance externe
  const base = `${input.symbol}_${input.tf}_${input.ts}`;
  return base.replace(/[^A-Z0-9:_-]/gi, "");
}

function normalizeAction(v: unknown): MemoryAction {
  const x = safeStr(v)?.toUpperCase();
  if (x === "ALLOW" || x === "WATCH" || x === "BLOCK") return x;
  return "WATCH";
}

function normalizeExecutionMode(v: unknown): MemoryExecutionMode {
  const x = safeStr(v)?.toLowerCase();
  if (
    x === "none" ||
    x === "progressive" ||
    x === "confirmation" ||
    x === "reduced" ||
    x === "dca_zone" ||
    x === "confirm_retest" ||
    x === "wait"
  ) {
    return x;
  }
  return "none";
}

function normalizeStatus(v: unknown): MemoryStatus {
  return v === "resolved" ? "resolved" : "open";
}

/* ------------------------------- GC / Limits ------------------------------ */

function maybeGc() {
  if (mem.size <= MAX_RECORDS) return;

  const entries = Array.from(mem.entries()).sort(
    (a, b) => a[1].createdAt - b[1].createdAt
  );

  const toDelete = Math.min(entries.length - MAX_RECORDS, GC_BATCH);

  for (let i = 0; i < toDelete; i++) {
    const [id, entry] = entries[i];
    mem.delete(id);

    const symbol = entry.value.symbol;
    const arr = indexBySymbol.get(symbol);
    if (arr) {
      indexBySymbol.set(
        symbol,
        arr.filter((x) => x !== id)
      );
    }
  }
}

/* ------------------------------- Core CRUD -------------------------------- */

export async function createMemoryRecord(input: {
  ts?: string;
  symbol: string;
  tf: string;
  snapshot_hash?: string | null;
  market_regime?: string | null;
  best_zone_price?: number | null;
  zone_score?: number | null;
  action: MemoryAction;
  execution_mode: MemoryExecutionMode;
}): Promise<SignalMemoryRecord> {
  const ts = safeStr(input.ts) ?? nowIso();
  const symbol = sanitizeSymbol(input.symbol);
  const tf = sanitizeTf(input.tf);

  const record: SignalMemoryRecord = {
    id: makeId({ symbol, tf, ts }),
    ts,

    symbol,
    tf,

    snapshot_hash: safeStr(input.snapshot_hash ?? null),
    market_regime: safeStr(input.market_regime ?? null),

    best_zone_price: safeNum(input.best_zone_price),
    zone_score: safeNum(input.zone_score) !== null
      ? clamp(input.zone_score as number, 0, 100)
      : null,

    action: normalizeAction(input.action),
    execution_mode: normalizeExecutionMode(input.execution_mode),

    observed_price_later: null,
    observed_result_pct: null,

    status: "open",
  };

  const t = nowMs();
  mem.set(record.id, {
    value: record,
    createdAt: t,
    updatedAt: t,
  });

  const prev = indexBySymbol.get(symbol) ?? [];
  indexBySymbol.set(symbol, [record.id, ...prev]);

  maybeGc();

  return record;
}

export async function getMemoryRecord(
  id: string
): Promise<SignalMemoryRecord | null> {
  const entry = mem.get(id);
  if (!entry) return null;
  return entry.value;
}

export async function updateMemoryObservation(input: {
  id: string;
  observed_price_later: number | null;
  observed_result_pct?: number | null;
  status?: MemoryStatus;
}): Promise<SignalMemoryRecord | null> {
  const entry = mem.get(input.id);
  if (!entry) return null;

  const current = entry.value;

  const updated: SignalMemoryRecord = {
    ...current,
    observed_price_later: safeNum(input.observed_price_later),
    observed_result_pct:
      safeNum(input.observed_result_pct) !== null
        ? safeNum(input.observed_result_pct)
        : current.observed_result_pct,
    status: normalizeStatus(input.status ?? "resolved"),
  };

  mem.set(input.id, {
    value: updated,
    createdAt: entry.createdAt,
    updatedAt: nowMs(),
  });

  return updated;
}

export async function listMemoryBySymbol(input: {
  symbol: string;
  limit?: number;
  status?: MemoryStatus | "all";
}): Promise<SignalMemoryRecord[]> {
  const symbol = sanitizeSymbol(input.symbol);
  const limit = clamp(input.limit ?? 50, 1, 500);
  const wantedStatus = input.status ?? "all";

  const ids = indexBySymbol.get(symbol) ?? [];
  const out: SignalMemoryRecord[] = [];

  for (const id of ids) {
    const entry = mem.get(id);
    if (!entry) continue;

    if (wantedStatus !== "all" && entry.value.status !== wantedStatus) {
      continue;
    }

    out.push(entry.value);

    if (out.length >= limit) break;
  }

  return out;
}

export async function listRecentMemory(input?: {
  limit?: number;
  status?: MemoryStatus | "all";
}): Promise<SignalMemoryRecord[]> {
  const limit = clamp(input?.limit ?? 100, 1, 1000);
  const wantedStatus = input?.status ?? "all";

  const values = Array.from(mem.values())
    .map((x) => x.value)
    .sort((a, b) => (a.ts < b.ts ? 1 : -1));

  if (wantedStatus === "all") return values.slice(0, limit);

  return values.filter((x) => x.status === wantedStatus).slice(0, limit);
}

/* ----------------------------- Derived Metrics ---------------------------- */

export async function getMemoryStats(input?: {
  symbol?: string;
}): Promise<{
  total: number;
  open: number;
  resolved: number;
  positive: number;
  negative: number;
  neutral: number;
}> {
  const symbol = input?.symbol ? sanitizeSymbol(input.symbol) : null;

  const records = symbol
    ? await listMemoryBySymbol({ symbol, limit: 10_000, status: "all" })
    : await listRecentMemory({ limit: 10_000, status: "all" });

  let open = 0;
  let resolved = 0;
  let positive = 0;
  let negative = 0;
  let neutral = 0;

  for (const r of records) {
    if (r.status === "open") open += 1;
    if (r.status === "resolved") resolved += 1;

    if (typeof r.observed_result_pct === "number") {
      if (r.observed_result_pct > 0) positive += 1;
      else if (r.observed_result_pct < 0) negative += 1;
      else neutral += 1;
    }
  }

  return {
    total: records.length,
    open,
    resolved,
    positive,
    negative,
    neutral,
  };
}

/* ------------------------------- Maintenance ------------------------------ */

export async function deleteMemoryRecord(id: string): Promise<boolean> {
  const entry = mem.get(id);
  if (!entry) return false;

  mem.delete(id);

  const symbol = entry.value.symbol;
  const arr = indexBySymbol.get(symbol);
  if (arr) {
    indexBySymbol.set(
      symbol,
      arr.filter((x) => x !== id)
    );
  }

  return true;
}

export async function __memoryStats() {
  return {
    records: mem.size,
    symbols: indexBySymbol.size,
  };
}
