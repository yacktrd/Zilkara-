/* ============================================================================
 * FILE: lib/xyvala/services/state-service.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala public market state service
 *
 * ROLE
 * - read canonical public scan snapshots from cache
 * - derive descriptive public market context from observable fields only
 * - prevent public scoring / decision / stability leakage
 *
 * DIRECTIVES
 * - public service only
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration logic
 * - no regime reconstruction
 * - no decision exposure
 * - no stability score exposure
 * - no opportunity exposure
 * - no investment signal
 * - observable market statistics only
 * ========================================================================== */

import { getFromCache, setToCache } from "@/lib/xyvala/cache/cache-core";
import { buildCanonicalSnapshotKey } from "@/lib/xyvala/cache/snapshot-key";
import {
  isScanSnapshot,
  XYVALA_SNAPSHOT_VERSION,
  type Quote,
  type ScanSnapshot,
} from "@/lib/xyvala/snapshot";

/* ============================================================================
 * 1. CONFIG
 * ========================================================================== */

const XYVALA_VERSION = XYVALA_SNAPSHOT_VERSION;
const DEFAULT_QUOTE: Quote = "eur";
const STATE_CACHE_TTL_MS = 15_000;

/* ============================================================================
 * 2. TYPES
 * ========================================================================== */

export type StateServiceInput = {
  quote?: Quote | string | null;
  noStore?: boolean;
};

export type StateServiceState = {
  assets_count: number;
  priced_assets_count: number;
  volume_assets_count: number;
  market_cap_assets_count: number;

  average_change_24h_pct: number | null;
  average_absolute_change_24h_pct: number | null;

  average_change_7d_pct: number | null;
  average_absolute_change_7d_pct: number | null;
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

export type ScanSnapshotReadResult = {
  snapshot: ScanSnapshot | null;
  warnings: string[];
};

/* ============================================================================
 * 3. SAFE HELPERS
 * ========================================================================== */

function nowIso(): string {
  return new Date().toISOString();
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function uniqueWarnings(
  ...groups: Array<string[] | undefined | null>
): string[] {
  return [
    ...new Set(
      groups
        .flatMap((group) => (Array.isArray(group) ? group : []))
        .filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0,
        ),
    ),
  ];
}

function normalizeQuote(value: unknown): Quote {
  const quote = safeString(value).toLowerCase();

  if (quote === "usd") return "usd";
  if (quote === "usdt") return "usdt";

  return DEFAULT_QUOTE;
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return round2(values.reduce((sum, value) => sum + value, 0) / values.length);
}

/* ============================================================================
 * 4. CACHE KEYS
 * ========================================================================== */

function buildStateCacheKey(quote: Quote): string {
  return `xyvala:state:v=${XYVALA_VERSION}&quote=${quote}`;
}

/* ============================================================================
 * 5. SNAPSHOT READER
 * ========================================================================== */

export async function readScanSnapshot(
  quote: Quote,
): Promise<ScanSnapshotReadResult> {
  const key = buildCanonicalSnapshotKey(quote);
  const raw = await getFromCache<unknown>(key);

  if (!isScanSnapshot(raw)) {
    return {
      snapshot: null,
      warnings: ["scan_snapshot_cache_miss_or_invalid"],
    };
  }

  return {
    snapshot: raw,
    warnings: [],
  };
}

/* ============================================================================
 * 6. PUBLIC MARKET CONTEXT
 * ========================================================================== */

function buildStateFromSnapshot(snapshot: ScanSnapshot): StateServiceState | null {
  const assets = Array.isArray(snapshot.data) ? snapshot.data : [];

  if (assets.length === 0) {
    return null;
  }

  const change24hValues: number[] = [];
  const absoluteChange24hValues: number[] = [];

  const change7dValues: number[] = [];
  const absoluteChange7dValues: number[] = [];

  let pricedAssetsCount = 0;
  let volumeAssetsCount = 0;
  let marketCapAssetsCount = 0;

  for (const asset of assets) {
    if (isFiniteNumber(asset.price)) {
      pricedAssetsCount += 1;
    }

    if (isFiniteNumber(asset.volume_24h)) {
      volumeAssetsCount += 1;
    }

    if (isFiniteNumber(asset.market_cap)) {
      marketCapAssetsCount += 1;
    }

    if (isFiniteNumber(asset.chg_24h_pct)) {
      change24hValues.push(asset.chg_24h_pct);
      absoluteChange24hValues.push(Math.abs(asset.chg_24h_pct));
    }

    if (isFiniteNumber(asset.chg_7d_pct)) {
      change7dValues.push(asset.chg_7d_pct);
      absoluteChange7dValues.push(Math.abs(asset.chg_7d_pct));
    }
  }

  return {
    assets_count: assets.length,
    priced_assets_count: pricedAssetsCount,
    volume_assets_count: volumeAssetsCount,
    market_cap_assets_count: marketCapAssetsCount,

    average_change_24h_pct: average(change24hValues),
    average_absolute_change_24h_pct: average(absoluteChange24hValues),

    average_change_7d_pct: average(change7dValues),
    average_absolute_change_7d_pct: average(absoluteChange7dValues),
  };
}

/* ============================================================================
 * 7. RESULT FACTORY
 * ========================================================================== */

function buildResult(
  input: Partial<StateServiceResult> & Pick<StateServiceResult, "ts" | "quote">,
): StateServiceResult {
  return {
    ok: input.ok === true,
    ts: input.ts,
    version: input.version ?? XYVALA_VERSION,
    source: input.source ?? "fallback",
    quote: input.quote,
    state: input.state ?? null,
    warnings: Array.isArray(input.warnings) ? input.warnings : [],
    error: input.error ?? null,
  };
}

/* ============================================================================
 * 8. PUBLIC SERVICE
 * ========================================================================== */

export async function getStateService(
  input: StateServiceInput = {},
): Promise<StateServiceResult> {
  const ts = nowIso();
  const quote = normalizeQuote(input.quote);
  const noStore = input.noStore === true;

  const stateCacheKey = buildStateCacheKey(quote);

  if (!noStore) {
    const cachedState = await getFromCache<StateServiceResult>(
      stateCacheKey,
      STATE_CACHE_TTL_MS,
    );

    if (cachedState) {
      return buildResult({
        ...cachedState,
        ts,
        source: "state_cache",
        quote,
      });
    }
  }

  let snapshot: ScanSnapshot | null = null;
  let warnings: string[] = [];

  try {
    const readResult = await readScanSnapshot(quote);

    snapshot = readResult.snapshot;
    warnings = uniqueWarnings(warnings, readResult.warnings);
  } catch (error: unknown) {
    warnings = uniqueWarnings(warnings, [
      error instanceof Error && error.message
        ? `scan_snapshot_read_failed:${error.message}`
        : "scan_snapshot_read_failed",
    ]);
  }

  if (!snapshot) {
    const fallback = buildResult({
      ok: false,
      ts,
      quote,
      source: "fallback",
      state: null,
      warnings,
      error: "scan_snapshot_missing_or_invalid",
    });

    if (!noStore) {
      await setToCache(stateCacheKey, fallback, STATE_CACHE_TTL_MS);
    }

    return fallback;
  }

  const state = buildStateFromSnapshot(snapshot);

  const result = buildResult({
    ok: state !== null,
    ts,
    quote,
    source: "scan_snapshot",
    state,
    warnings: state
      ? warnings
      : uniqueWarnings(warnings, ["public_market_state_unavailable"]),
    error: state ? null : "public_market_state_unavailable",
  });

  if (!noStore) {
    await setToCache(stateCacheKey, result, STATE_CACHE_TTL_MS);
  }

  return result;
}
