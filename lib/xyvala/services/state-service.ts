// lib/xyvala/services/state-service.ts

import {
  getFromCache,
  scanKey,
  setToCache,
  type ScanSnapshot,
  type Quote,
} from "@/lib/xyvala/snapshot";

const XYVALA_VERSION = "v1";
const DEFAULT_MARKET = "crypto";
const DEFAULT_QUOTE: Quote = "usd";
const DEFAULT_SORT = "score";
const DEFAULT_ORDER = "desc";
const DEFAULT_LIMIT = 250;

const SNAPSHOT_TTL_MS = 45_000;
const STATE_CACHE_TTL_MS = 15_000;

export type MarketRegime = "STABLE" | "TRANSITION" | "VOLATILE" | null;

export type StateServiceInput = {
  quote?: Quote | string | null;
  noStore?: boolean;
};

export type StateServiceState = {
  market_regime: MarketRegime;
  stable_ratio: number | null;
  transition_ratio: number | null;
  volatile_ratio: number | null;
  liquidity_state: string | null;
  volatility_state: string | null;
  risk_mode: string | null;
  execution_bias: string | null;
};

export type StateServiceResult = {
  ok: boolean;
  ts: string;
  version: string;
  source: "state_cache" | "scan_snapshot" | "fallback";
  quote: Quote;
  state: StateServiceState | null;
  warnings: string[];
  error: string | null;
};

type StateCacheEntry = {
  ts: number;
  value: StateServiceResult;
};

const mem = new Map<string, StateCacheEntry>();

function nowIso(): string {
  return new Date().toISOString();
}

function nowMs(): number {
  return Date.now();
}

function safeStr(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeNum(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function uniqueWarnings(...groups: Array<string[] | undefined | null>): string[] {
  const merged = groups.flatMap((group) => (Array.isArray(group) ? group : []));
  return [...new Set(merged.filter((item) => typeof item === "string" && item.trim().length > 0))];
}

function normalizeQuote(value: unknown): Quote {
  const quote = safeStr(value).toLowerCase();
  if (quote === "eur") return "eur";
  if (quote === "usdt") return "usdt";
  return DEFAULT_QUOTE;
}

function normalizeRegime(value: unknown): MarketRegime {
  const regime = safeStr(value).toUpperCase();
  if (regime === "STABLE") return "STABLE";
  if (regime === "TRANSITION") return "TRANSITION";
  if (regime === "VOLATILE") return "VOLATILE";
  return null;
}

function buildSnapshotCacheKey(quote: Quote): string {
  return scanKey({
    version: XYVALA_VERSION,
    market: DEFAULT_MARKET,
    quote,
    sort: DEFAULT_SORT,
    order: DEFAULT_ORDER,
    limit: DEFAULT_LIMIT,
    q: null,
  });
}

function buildStateCacheKey(quote: Quote): string {
  return `xyvala:state:${XYVALA_VERSION}:quote=${quote}`;
}

function getStateMemCache(key: string, ttlMs: number): StateServiceResult | null {
  const entry = mem.get(key);
  if (!entry) return null;

  if (nowMs() - entry.ts > ttlMs) {
    mem.delete(key);
    return null;
  }

  return entry.value;
}

function setStateMemCache(key: string, value: StateServiceResult): void {
  mem.set(key, {
    ts: nowMs(),
    value,
  });
}

function inferLiquidityState(stableRatio: number | null): string | null {
  if (stableRatio === null) return null;
  if (stableRatio >= 0.7) return "HIGH";
  if (stableRatio >= 0.45) return "BALANCED";
  return "THIN";
}

function inferVolatilityState(volatileRatio: number | null): string | null {
  if (volatileRatio === null) return null;
  if (volatileRatio >= 0.35) return "HIGH";
  if (volatileRatio >= 0.15) return "MEDIUM";
  return "LOW";
}

function inferRiskMode(regime: MarketRegime, volatileRatio: number | null): string | null {
  if (regime === "STABLE") return "DEFENSIVE";
  if (regime === "TRANSITION") return "SELECTIVE";
  if (regime === "VOLATILE") return volatileRatio !== null && volatileRatio >= 0.45 ? "RISK_OFF" : "TACTICAL";
  return null;
}

function inferExecutionBias(regime: MarketRegime, stableRatio: number | null): string | null {
  if (regime === "STABLE") return "MEAN_REVERSION";
  if (regime === "TRANSITION") return "MIXED";
  if (regime === "VOLATILE") return stableRatio !== null && stableRatio < 0.25 ? "BREAKOUT" : "FAST_REACTION";
  return null;
}

function buildStateFromSnapshot(snapshot: ScanSnapshot): StateServiceState | null {
  const market_regime = normalizeRegime(snapshot.context?.market_regime);
  const stable_ratio = safeNum(snapshot.context?.stable_ratio);
  const transition_ratio = safeNum(snapshot.context?.transition_ratio);
  const volatile_ratio = safeNum(snapshot.context?.volatile_ratio);

  const hasCoreSignal =
    market_regime !== null ||
    stable_ratio !== null ||
    transition_ratio !== null ||
    volatile_ratio !== null;

  if (!hasCoreSignal) {
    return null;
  }

  return {
    market_regime,
    stable_ratio,
    transition_ratio,
    volatile_ratio,
    liquidity_state: inferLiquidityState(stable_ratio),
    volatility_state: inferVolatilityState(volatile_ratio),
    risk_mode: inferRiskMode(market_regime, volatile_ratio),
    execution_bias: inferExecutionBias(market_regime, stable_ratio),
  };
}

function buildResult(
  input: Partial<StateServiceResult> & Pick<StateServiceResult, "ts" | "quote">
): StateServiceResult {
  return {
    ok: Boolean(input.ok),
    ts: input.ts,
    version: input.version ?? XYVALA_VERSION,
    source: input.source ?? "fallback",
    quote: input.quote,
    state: input.state ?? null,
    warnings: input.warnings ?? [],
    error: input.error ?? null,
  };
}

export async function getStateService(
  input: StateServiceInput = {}
): Promise<StateServiceResult> {
  const ts = nowIso();
  const quote = normalizeQuote(input.quote);
  const noStore = input.noStore === true;

  const stateCacheKey = buildStateCacheKey(quote);

  if (!noStore) {
    const cachedState = getStateMemCache(stateCacheKey, STATE_CACHE_TTL_MS);

    if (cachedState) {
      return buildResult({
        ...cachedState,
        ts,
        source: "state_cache",
        quote,
      });
    }
  }

  const warnings: string[] = [];
  const snapshotCacheKey = buildSnapshotCacheKey(quote);

  let snapshot: ScanSnapshot | null = null;

  try {
    const cachedSnapshot = getFromCache<ScanSnapshot>(snapshotCacheKey, SNAPSHOT_TTL_MS);
    snapshot = cachedSnapshot ?? null;

    if (!snapshot) {
      warnings.push("scan_snapshot_missing");
    }
  } catch (error) {
    warnings.push(
      error instanceof Error && error.message
        ? `scan_snapshot_read_failed:${error.message}`
        : "scan_snapshot_read_failed"
    );
  }

  if (!snapshot) {
    const fallback = buildResult({
      ok: false,
      ts,
      quote,
      source: "fallback",
      state: null,
      warnings,
      error: "scan_snapshot_missing",
    });

    if (!noStore) {
      setStateMemCache(stateCacheKey, fallback);
    }

    return fallback;
  }

  const state = buildStateFromSnapshot(snapshot);

  if (!state) {
    const degraded = buildResult({
      ok: false,
      ts,
      quote,
      source: "scan_snapshot",
      state: null,
      warnings: uniqueWarnings(warnings, ["state_context_missing_or_invalid"]),
      error: "state_context_missing_or_invalid",
    });

    if (!noStore) {
      setStateMemCache(stateCacheKey, degraded);
    }

    return degraded;
  }

  const result = buildResult({
    ok: true,
    ts,
    quote,
    source: "scan_snapshot",
    state,
    warnings,
    error: null,
  });

  if (!noStore) {
    setStateMemCache(stateCacheKey, result);

    try {
      setToCache(`xyvala:state:snapshot:${XYVALA_VERSION}:quote=${quote}`, result);
    } catch (error) {
      void error;
    }
  }

  return result;
}
