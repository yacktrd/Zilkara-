/* ============================================================================
 * FILE: lib/xyvala/stores/performance-store.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala performance traceability store
 *
 * ROLE
 * - store post-detection performance observations
 * - measure returns, drawdowns and benchmark deltas after detections
 * - provide deterministic read helpers for audit, lifecycle and calibration
 * - preserve performance history without producing financial advice
 *
 * PARENT FILES
 * - lib/xyvala/stores/detection-store.ts
 * - lib/xyvala/stores/transition-lifecycle-store.ts
 *
 * DIRECTIVES
 * - MUTATE layer only
 * - traceability and validation only
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration logic
 * - no public API response building
 * - no UI logic
 * - no financial advice
 * - no prediction
 * - no buy / sell / hold semantics
 * - append-only by default
 * - deterministic record identity
 *
 * INPUTS
 * - PerformanceRecordInput
 *
 * OUTPUTS
 * - PerformanceRecord
 * - PerformanceStoreSnapshot
 *
 * INVARIANTS
 * - one performance record represents one observed result horizon
 * - performance store does not create analytical truth
 * - performance values must come from observed market data
 * - null means explicitly unavailable
 * - undefined must never be stored
 * - outcome_state is descriptive, not advisory
 *
 * CRITICAL DEPENDENCIES
 * - performance_id
 * - detection_id
 * - asset_id
 * - horizon
 * - observed_at
 *
 * SENSITIVE ZONES
 * - return interpretation
 * - benchmark comparison
 * - outcome labeling
 * - future persistence migration
 * ========================================================================== */

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type PerformanceStoreStatus =
  | "recorded"
  | "duplicate"
  | "invalid"
  | "unavailable";

export type PerformanceHorizon =
  | "24H"
  | "7D"
  | "30D"
  | "90D"
  | "CUSTOM";

export type PerformanceOutcomeState =
  | "positive"
  | "neutral"
  | "negative"
  | "unknown";

export type PerformanceRecord = {
  performance_id: string;

  detection_id: string;
  transition_id: string | null;

  asset_id: string;
  symbol: string;
  name: string;

  horizon: PerformanceHorizon;

  detected_at: string;
  observed_at: string;

  entry_price: number | null;
  observed_price: number | null;

  entry_market_cap: number | null;
  observed_market_cap: number | null;

  entry_volume_24h: number | null;
  observed_volume_24h: number | null;

  return_pct: number | null;

  return_24h_pct: number | null;
  return_7d_pct: number | null;
  return_30d_pct: number | null;
  return_90d_pct: number | null;

  max_gain_pct: number | null;
  max_drawdown_pct: number | null;

  average_return_pct: number | null;
  recovery_time_days: number | null;

  btc_return_pct: number | null;
  eth_return_pct: number | null;
  market_return_pct: number | null;

  vs_btc_pct: number | null;
  vs_eth_pct: number | null;
  vs_market_pct: number | null;

  outcome_state: PerformanceOutcomeState;

  snapshot_version: string;
  analytical_version: string;

  created_at: string;
};

export type PerformanceRecordInput =
  Partial<PerformanceRecord> & {
    performance_id?: unknown;

    detection_id?: unknown;
    transition_id?: unknown;

    asset_id?: unknown;
    symbol?: unknown;
    name?: unknown;

    horizon?: unknown;

    detected_at?: unknown;
    observed_at?: unknown;

    snapshot_version?: unknown;
    analytical_version?: unknown;
  };

export type PerformanceWriteResult = {
  ok: boolean;
  status: PerformanceStoreStatus;
  record: PerformanceRecord | null;
  error: string | null;
};

export type PerformanceStoreSnapshot = {
  ok: boolean;
  count: number;
  records: PerformanceRecord[];
  warnings: string[];
};

/* ============================================================================
 * 2. IN-MEMORY STORE
 * ========================================================================== */

const performanceStore = new Map<string, PerformanceRecord>();

/* ============================================================================
 * 3. SAFE HELPERS
 * ========================================================================== */

function nowIso(): string {
  return new Date().toISOString();
}

function safeString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function safeNullableString(value: unknown): string | null {
  const normalized = safeString(value);
  return normalized.length > 0 ? normalized : null;
}

function safeNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function roundPct(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeIsoDate(value: unknown, fallback: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return fallback;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return parsed.toISOString();
}

function normalizeHorizon(value: unknown): PerformanceHorizon {
  if (value === "24H") return "24H";
  if (value === "7D") return "7D";
  if (value === "30D") return "30D";
  if (value === "90D") return "90D";
  if (value === "CUSTOM") return "CUSTOM";

  return "CUSTOM";
}

function computeReturnPct(input: {
  entry_price: number | null;
  observed_price: number | null;
}): number | null {
  if (
    input.entry_price === null ||
    input.observed_price === null ||
    input.entry_price <= 0
  ) {
    return null;
  }

  return roundPct(
    ((input.observed_price - input.entry_price) / input.entry_price) * 100,
  );
}

function computeDeltaPct(input: {
  asset_return_pct: number | null;
  benchmark_return_pct: number | null;
}): number | null {
  if (
    input.asset_return_pct === null ||
    input.benchmark_return_pct === null
  ) {
    return null;
  }

  return roundPct(input.asset_return_pct - input.benchmark_return_pct);
}

function normalizeOutcomeState(input: {
  explicit_state?: unknown;
  return_pct: number | null;
}): PerformanceOutcomeState {
  if (input.explicit_state === "positive") return "positive";
  if (input.explicit_state === "neutral") return "neutral";
  if (input.explicit_state === "negative") return "negative";
  if (input.explicit_state === "unknown") return "unknown";

  if (input.return_pct === null) return "unknown";
  if (input.return_pct > 0) return "positive";
  if (input.return_pct < 0) return "negative";

  return "neutral";
}

function buildPerformanceId(input: {
  detection_id: string;
  asset_id: string;
  horizon: PerformanceHorizon;
  observed_at: string;
  analytical_version: string;
}): string {
  return [
    "performance",
    input.detection_id,
    input.asset_id.toLowerCase(),
    input.horizon,
    input.observed_at,
    input.analytical_version,
  ]
    .join("|")
    .replace(/\s+/g, "");
}

function validateRecord(record: PerformanceRecord): string | null {
  if (!record.performance_id) return "performance_id_missing";
  if (!record.detection_id) return "detection_id_missing";
  if (!record.asset_id) return "asset_id_missing";
  if (!record.symbol) return "symbol_missing";
  if (!record.name) return "name_missing";
  if (!record.detected_at) return "detected_at_missing";
  if (!record.observed_at) return "observed_at_missing";
  if (!record.snapshot_version) return "snapshot_version_missing";
  if (!record.analytical_version) return "analytical_version_missing";

  return null;
}

/* ============================================================================
 * 4. RECORD BUILDER
 * ========================================================================== */

export function buildPerformanceRecord(
  input: PerformanceRecordInput,
): PerformanceRecord {
  const createdAt = nowIso();

  const detectionId = safeString(input.detection_id);
  const assetId = safeString(
    input.asset_id,
    safeString(input.symbol, "unknown").toLowerCase(),
  );

  const symbol = safeString(input.symbol, "UNKNOWN").toUpperCase();
  const name = safeString(input.name, symbol);

  const horizon = normalizeHorizon(input.horizon);

  const detectedAt = normalizeIsoDate(input.detected_at, createdAt);
  const observedAt = normalizeIsoDate(input.observed_at, createdAt);

  const snapshotVersion = safeString(input.snapshot_version, "unknown");
  const analyticalVersion = safeString(input.analytical_version, "unknown");

  const entryPrice = safeNullableNumber(input.entry_price);
  const observedPrice = safeNullableNumber(input.observed_price);

  const returnPct =
    safeNullableNumber(input.return_pct) ??
    computeReturnPct({
      entry_price: entryPrice,
      observed_price: observedPrice,
    });

  const btcReturnPct = safeNullableNumber(input.btc_return_pct);
  const ethReturnPct = safeNullableNumber(input.eth_return_pct);
  const marketReturnPct = safeNullableNumber(input.market_return_pct);

  const vsBtcPct =
    safeNullableNumber(input.vs_btc_pct) ??
    computeDeltaPct({
      asset_return_pct: returnPct,
      benchmark_return_pct: btcReturnPct,
    });

  const vsEthPct =
    safeNullableNumber(input.vs_eth_pct) ??
    computeDeltaPct({
      asset_return_pct: returnPct,
      benchmark_return_pct: ethReturnPct,
    });

  const vsMarketPct =
    safeNullableNumber(input.vs_market_pct) ??
    computeDeltaPct({
      asset_return_pct: returnPct,
      benchmark_return_pct: marketReturnPct,
    });

  const performanceId =
    safeString(input.performance_id) ||
    buildPerformanceId({
      detection_id: detectionId,
      asset_id: assetId,
      horizon,
      observed_at: observedAt,
      analytical_version: analyticalVersion,
    });

  return {
    performance_id: performanceId,

    detection_id: detectionId,
    transition_id: safeNullableString(input.transition_id),

    asset_id: assetId,
    symbol,
    name,

    horizon,

    detected_at: detectedAt,
    observed_at: observedAt,

    entry_price: entryPrice,
    observed_price: observedPrice,

    entry_market_cap: safeNullableNumber(input.entry_market_cap),
    observed_market_cap: safeNullableNumber(input.observed_market_cap),

    entry_volume_24h: safeNullableNumber(input.entry_volume_24h),
    observed_volume_24h: safeNullableNumber(input.observed_volume_24h),

    return_pct: returnPct,

    return_24h_pct: safeNullableNumber(input.return_24h_pct),
    return_7d_pct: safeNullableNumber(input.return_7d_pct),
    return_30d_pct: safeNullableNumber(input.return_30d_pct),
    return_90d_pct: safeNullableNumber(input.return_90d_pct),

    max_gain_pct: safeNullableNumber(input.max_gain_pct),
    max_drawdown_pct: safeNullableNumber(input.max_drawdown_pct),

    average_return_pct: safeNullableNumber(input.average_return_pct),
    recovery_time_days: safeNullableNumber(input.recovery_time_days),

    btc_return_pct: btcReturnPct,
    eth_return_pct: ethReturnPct,
    market_return_pct: marketReturnPct,

    vs_btc_pct: vsBtcPct,
    vs_eth_pct: vsEthPct,
    vs_market_pct: vsMarketPct,

    outcome_state: normalizeOutcomeState({
      explicit_state: input.outcome_state,
      return_pct: returnPct,
    }),

    snapshot_version: snapshotVersion,
    analytical_version: analyticalVersion,

    created_at: normalizeIsoDate(input.created_at, createdAt),
  };
}

/* ============================================================================
 * 5. MUTATION API
 * ========================================================================== */

export function recordPerformance(
  input: PerformanceRecordInput,
): PerformanceWriteResult {
  const record = buildPerformanceRecord(input);
  const validationError = validateRecord(record);

  if (validationError) {
    return {
      ok: false,
      status: "invalid",
      record: null,
      error: validationError,
    };
  }

  if (performanceStore.has(record.performance_id)) {
    return {
      ok: true,
      status: "duplicate",
      record: performanceStore.get(record.performance_id) ?? null,
      error: null,
    };
  }

  performanceStore.set(record.performance_id, Object.freeze({ ...record }));

  return {
    ok: true,
    status: "recorded",
    record,
    error: null,
  };
}

export function recordPerformances(
  inputs: readonly PerformanceRecordInput[],
): PerformanceWriteResult[] {
  return inputs.map(recordPerformance);
}

export function clearPerformanceStore(): void {
  performanceStore.clear();
}

/* ============================================================================
 * 6. READ API
 * ========================================================================== */

export function listPerformanceRecords(): PerformanceRecord[] {
  return [...performanceStore.values()];
}

export function getPerformanceRecord(
  performanceId: string,
): PerformanceRecord | null {
  return performanceStore.get(performanceId) ?? null;
}

export function listPerformanceRecordsByDetection(
  detectionId: string,
): PerformanceRecord[] {
  const normalizedDetectionId = safeString(detectionId);

  return listPerformanceRecords().filter(
    (record) => record.detection_id === normalizedDetectionId,
  );
}

export function listPerformanceRecordsByTransition(
  transitionId: string,
): PerformanceRecord[] {
  const normalizedTransitionId = safeString(transitionId);

  return listPerformanceRecords().filter(
    (record) => record.transition_id === normalizedTransitionId,
  );
}

export function listPerformanceRecordsByAsset(
  assetId: string,
): PerformanceRecord[] {
  const normalizedAssetId = safeString(assetId).toLowerCase();

  return listPerformanceRecords().filter(
    (record) => record.asset_id.toLowerCase() === normalizedAssetId,
  );
}

export function listPerformanceRecordsBySymbol(
  symbol: string,
): PerformanceRecord[] {
  const normalizedSymbol = safeString(symbol).toUpperCase();

  return listPerformanceRecords().filter(
    (record) => record.symbol === normalizedSymbol,
  );
}

export function listPerformanceRecordsByHorizon(
  horizon: PerformanceHorizon,
): PerformanceRecord[] {
  return listPerformanceRecords().filter(
    (record) => record.horizon === horizon,
  );
}

export function getPerformanceStoreSnapshot(): PerformanceStoreSnapshot {
  return {
    ok: true,
    count: performanceStore.size,
    records: listPerformanceRecords(),
    warnings: [],
  };
}
