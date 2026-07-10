/* ============================================================================
 * FILE: lib/xyvala/stores/detection-store.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala detection traceability store
 *
 * ROLE
 * - store immutable detection records
 * - provide a lightweight in-memory traceability layer
 * - preserve detection history without recalculating analytical truth
 * - expose deterministic read helpers for audit, lifecycle and calibration
 *
 * PARENT FILES
 * - lib/xyvala/contracts/scan-contract.ts
 * - lib/xyvala/contracts/scan-private-contract.ts
 * - lib/xyvala/snapshot.ts
 *
 * DIRECTIVES
 * - MUTATE layer only
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration logic
 * - no snapshot shaping
 * - no API response building
 * - no UI logic
 * - no public/private leakage
 * - no financial advice
 * - no prediction
 * - append-only by default
 * - deterministic record identity
 * - EUR is the default monetary reference
 *
 * INPUTS
 * - DetectionStoreRecordInput
 *
 * OUTPUTS
 * - DetectionStoreRecord
 * - DetectionStoreSnapshot
 *
 * INVARIANTS
 * - detection records are immutable after insertion
 * - same detection identity cannot be inserted twice
 * - null means explicitly unavailable
 * - undefined must never be stored
 * - store does not create analytical truth
 * - store only records already produced values
 *
 * CRITICAL DEPENDENCIES
 * - Detection IDs
 * - asset identity
 * - snapshot version
 * - analytical version
 * - detected timestamp
 *
 * SENSITIVE ZONES
 * - private/public boundary
 * - duplicate detection prevention
 * - future persistence migration
 * ========================================================================== */

import type { Quote } from "@/lib/xyvala/snapshot";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type DetectionStoreStatus =
  | "recorded"
  | "duplicate"
  | "invalid"
  | "unavailable";

export type DetectionStoreSource =
  | "scan"
  | "snapshot"
  | "runtime"
  | "manual"
  | "fallback";

export type DetectionStoreRecord = {
  detection_id: string;

  asset_id: string;
  symbol: string;
  name: string;

  detected_at: string;
  quote: Quote;

  snapshot_version: string;
  analytical_version: string;

  source: DetectionStoreSource;

  rank: number | null;

  price: number | null;
  market_cap: number | null;
  volume_24h: number | null;

  chg_24h_pct: number | null;
  chg_7d_pct: number | null;

  public_activity: string | null;
  public_structure_transition: string | null;
  public_impulse_context: string | null;

  created_at: string;
};

export type DetectionStoreRecordInput = Partial<DetectionStoreRecord> & {
  asset_id?: unknown;
  symbol?: unknown;
  name?: unknown;
  detected_at?: unknown;
  quote?: unknown;
  snapshot_version?: unknown;
  analytical_version?: unknown;
};

export type DetectionStoreWriteResult = {
  ok: boolean;
  status: DetectionStoreStatus;
  record: DetectionStoreRecord | null;
  error: string | null;
};

export type DetectionStoreSnapshot = {
  ok: boolean;
  count: number;
  records: DetectionStoreRecord[];
  warnings: string[];
};

/* ============================================================================
 * 2. IN-MEMORY STORE
 * ========================================================================== */

const detectionStore = new Map<string, DetectionStoreRecord>();

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

function normalizeQuote(value: unknown): Quote {
  if (value === "usd") return "usd";
  if (value === "usdt") return "usdt";

  return "eur";
}

function normalizeSource(value: unknown): DetectionStoreSource {
  if (value === "snapshot") return "snapshot";
  if (value === "runtime") return "runtime";
  if (value === "manual") return "manual";
  if (value === "fallback") return "fallback";

  return "scan";
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

function buildDetectionId(input: {
  asset_id: string;
  symbol: string;
  detected_at: string;
  snapshot_version: string;
  analytical_version: string;
}): string {
  return [
    "det",
    input.asset_id.toLowerCase(),
    input.symbol.toUpperCase(),
    input.detected_at,
    input.snapshot_version,
    input.analytical_version,
  ]
    .join("|")
    .replace(/\s+/g, "");
}

function validateRecord(record: DetectionStoreRecord): string | null {
  if (!record.detection_id) return "detection_id_missing";
  if (!record.asset_id) return "asset_id_missing";
  if (!record.symbol) return "symbol_missing";
  if (!record.name) return "name_missing";
  if (!record.detected_at) return "detected_at_missing";
  if (!record.snapshot_version) return "snapshot_version_missing";
  if (!record.analytical_version) return "analytical_version_missing";

  return null;
}

/* ============================================================================
 * 4. RECORD BUILDER
 * ========================================================================== */

export function buildDetectionStoreRecord(
  input: DetectionStoreRecordInput,
): DetectionStoreRecord {
  const createdAt = nowIso();

  const assetId = safeString(input.asset_id, safeString(input.symbol, "unknown").toLowerCase());
  const symbol = safeString(input.symbol, "UNKNOWN").toUpperCase();
  const name = safeString(input.name, symbol);

  const detectedAt = normalizeIsoDate(input.detected_at, createdAt);
  const snapshotVersion = safeString(input.snapshot_version, "unknown");
  const analyticalVersion = safeString(input.analytical_version, "unknown");

  const detectionId =
    safeString(input.detection_id) ||
    buildDetectionId({
      asset_id: assetId,
      symbol,
      detected_at: detectedAt,
      snapshot_version: snapshotVersion,
      analytical_version: analyticalVersion,
    });

  return {
    detection_id: detectionId,

    asset_id: assetId,
    symbol,
    name,

    detected_at: detectedAt,
    quote: normalizeQuote(input.quote),

    snapshot_version: snapshotVersion,
    analytical_version: analyticalVersion,

    source: normalizeSource(input.source),

    rank: safeNullableNumber(input.rank),

    price: safeNullableNumber(input.price),
    market_cap: safeNullableNumber(input.market_cap),
    volume_24h: safeNullableNumber(input.volume_24h),

    chg_24h_pct: safeNullableNumber(input.chg_24h_pct),
    chg_7d_pct: safeNullableNumber(input.chg_7d_pct),

    public_activity: safeNullableString(input.public_activity),
    public_structure_transition: safeNullableString(
      input.public_structure_transition,
    ),
    public_impulse_context: safeNullableString(input.public_impulse_context),

    created_at: createdAt,
  };
}

/* ============================================================================
 * 5. MUTATION API
 * ========================================================================== */

export function recordDetection(
  input: DetectionStoreRecordInput,
): DetectionStoreWriteResult {
  const record = buildDetectionStoreRecord(input);
  const validationError = validateRecord(record);

  if (validationError) {
    return {
      ok: false,
      status: "invalid",
      record: null,
      error: validationError,
    };
  }

  if (detectionStore.has(record.detection_id)) {
    return {
      ok: true,
      status: "duplicate",
      record: detectionStore.get(record.detection_id) ?? null,
      error: null,
    };
  }

  detectionStore.set(record.detection_id, Object.freeze({ ...record }));

  return {
    ok: true,
    status: "recorded",
    record,
    error: null,
  };
}

export function recordDetections(
  inputs: readonly DetectionStoreRecordInput[],
): DetectionStoreWriteResult[] {
  return inputs.map(recordDetection);
}

export function clearDetectionStore(): void {
  detectionStore.clear();
}

/* ============================================================================
 * 6. READ API
 * ========================================================================== */

export function listDetectionRecords(): DetectionStoreRecord[] {
  return [...detectionStore.values()];
}

export function getDetectionRecord(
  detectionId: string,
): DetectionStoreRecord | null {
  return detectionStore.get(detectionId) ?? null;
}

export function listDetectionRecordsByAsset(
  assetId: string,
): DetectionStoreRecord[] {
  const normalizedAssetId = safeString(assetId).toLowerCase();

  return listDetectionRecords().filter(
    (record) => record.asset_id.toLowerCase() === normalizedAssetId,
  );
}

export function listDetectionRecordsBySymbol(
  symbol: string,
): DetectionStoreRecord[] {
  const normalizedSymbol = safeString(symbol).toUpperCase();

  return listDetectionRecords().filter(
    (record) => record.symbol === normalizedSymbol,
  );
}

export function getDetectionStoreSnapshot(): DetectionStoreSnapshot {
  return {
    ok: true,
    count: detectionStore.size,
    records: listDetectionRecords(),
    warnings: [],
  };
}
