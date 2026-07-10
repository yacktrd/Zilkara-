/* ============================================================================
 * FILE: lib/xyvala/services/transition-lifecycle-service.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala transition lifecycle orchestration service
 *
 * ROLE
 * - connect detection traceability to transition lifecycle records
 * - create or update transition lifecycle entries from already computed assets
 * - preserve transition persistence, re-entry and audit continuity
 * - provide deterministic private lifecycle orchestration without recalculation
 *
 * PARENT FILES
 * - lib/xyvala/contracts/scan-private-contract.ts
 * - lib/xyvala/stores/detection-store.ts
 * - lib/xyvala/stores/transition-lifecycle-store.ts
 * - lib/xyvala/stores/traceability-store-orchestrator.ts
 *
 * DIRECTIVES
 * - private MUTATE orchestration only
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration computation
 * - no performance computation
 * - no public API response building
 * - no UI logic
 * - no financial advice
 * - no prediction
 * - no buy / sell / hold semantics
 * - lifecycle values come from already computed traceability inputs
 * - same input state => same lifecycle mutation path
 *
 * INPUTS
 * - PrivateScanAsset
 * - detection_id
 * - detected_at
 * - snapshot_version
 * - analytical_version
 *
 * OUTPUTS
 * - TransitionLifecycleServiceResult
 *
 * INVARIANTS
 * - lifecycle service does not create analytical truth
 * - lifecycle service only connects existing detection truth to lifecycle truth
 * - active lifecycle is searched before creating a new cycle
 * - transition_id remains produced by transition-lifecycle-store.ts
 * - null means explicitly unavailable
 * - undefined must never be propagated
 *
 * CRITICAL DEPENDENCIES
 * - PrivateScanAsset
 * - recordTransitionLifecycle
 * - updateTransitionLifecycle
 * - listActiveTransitionLifecycleRecords
 *
 * SENSITIVE ZONES
 * - duplicate transition creation
 * - re-entry counting
 * - transition state normalization
 * - private analytical leakage
 * ========================================================================== */

import type { PrivateScanAsset } from "@/lib/xyvala/contracts/scan-private-contract";

import {
  listActiveTransitionLifecycleRecords,
  recordTransitionLifecycle,
  updateTransitionLifecycle,
  type TransitionLifecycleRecord,
  type TransitionLifecycleState,
  type TransitionLifecycleWriteResult,
} from "@/lib/xyvala/stores/transition-lifecycle-store";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type TransitionLifecycleServiceStatus =
  | "recorded"
  | "updated"
  | "skipped"
  | "invalid"
  | "unavailable";

export type TransitionLifecycleServiceInput = {
  asset: PrivateScanAsset;
  detection_id: string;
  detected_at: string;
  snapshot_version: string;
  analytical_version: string;
};

export type TransitionLifecycleServiceResult = {
  ok: boolean;
  status: TransitionLifecycleServiceStatus;
  asset_id: string;
  symbol: string;
  transition_id: string | null;
  transition_state: TransitionLifecycleState;
  action: "record" | "update" | "skip";
  record: TransitionLifecycleRecord | null;
  write_result: TransitionLifecycleWriteResult | null;
  warnings: string[];
  error: string | null;
};

export type TransitionLifecycleBatchResult = {
  ok: boolean;
  count: number;
  recorded_count: number;
  updated_count: number;
  skipped_count: number;
  invalid_count: number;
  results: TransitionLifecycleServiceResult[];
  warnings: string[];
};

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

function safeString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function safeNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeTransitionState(value: unknown): TransitionLifecycleState {
  if (value === "COMPRESSION") return "COMPRESSION";
  if (value === "PRESSURE_BUILDING") return "PRESSURE_BUILDING";
  if (value === "RELEASE") return "RELEASE";
  if (value === "EXHAUSTION") return "EXHAUSTION";
  if (value === "NEUTRAL") return "NEUTRAL";

  return "UNKNOWN";
}

function normalizeIsoDate(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
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

/* ============================================================================
 * 3. TRANSITION RESOLUTION
 * ========================================================================== */

function resolveAssetTransitionState(
  asset: PrivateScanAsset,
): TransitionLifecycleState {
  return normalizeTransitionState(asset.impulse_transition_state);
}

function findActiveTransition(input: {
  asset_id: string;
  transition_state: TransitionLifecycleState;
}): TransitionLifecycleRecord | null {
  const assetId = input.asset_id.toLowerCase();

  return (
    listActiveTransitionLifecycleRecords().find(
      (record) =>
        record.asset_id.toLowerCase() === assetId &&
        record.transition_state === input.transition_state,
    ) ?? null
  );
}

function shouldSkipLifecycle(input: {
  asset_id: string;
  detection_id: string;
  detected_at: string | null;
  transition_state: TransitionLifecycleState;
}): string | null {
  if (!input.asset_id) return "asset_id_missing";
  if (!input.detection_id) return "detection_id_missing";
  if (!input.detected_at) return "detected_at_invalid";
  if (input.transition_state === "UNKNOWN") return "transition_state_unknown";

  return null;
}

/* ============================================================================
 * 4. SERVICE API
 * ========================================================================== */

export function recordOrUpdateTransitionLifecycle(
  input: TransitionLifecycleServiceInput,
): TransitionLifecycleServiceResult {
  const asset = input.asset;

  const assetId = safeString(asset.id);
  const symbol = safeString(asset.symbol, "UNKNOWN").toUpperCase();
  const name = safeString(asset.name, symbol);

  const detectionId = safeString(input.detection_id);
  const detectedAt = normalizeIsoDate(input.detected_at);

  if (!detectedAt) {
    return {
      ok: false,
      status: "skipped",
      asset_id: assetId,
      symbol,
      transition_id: null,
      transition_state: "UNKNOWN",
      action: "skip",
      record: null,
      write_result: null,
      warnings: ["transition_lifecycle_skipped:detected_at_invalid"],
      error: "detected_at_invalid",
    };
  }

  const snapshotVersion = safeString(input.snapshot_version, "unknown");
  const analyticalVersion = safeString(input.analytical_version, "unknown");

  const transitionState = resolveAssetTransitionState(asset);

  const skipReason = shouldSkipLifecycle({
    asset_id: assetId,
    detection_id: detectionId,
    detected_at: detectedAt,
    transition_state: transitionState,
  });

  if (skipReason) {
    return {
      ok: false,
      status: "skipped",
      asset_id: assetId,
      symbol,
      transition_id: null,
      transition_state: transitionState,
      action: "skip",
      record: null,
      write_result: null,
      warnings: [`transition_lifecycle_skipped:${skipReason}`],
      error: skipReason,
    };
  }

  const activeTransition = findActiveTransition({
    asset_id: assetId,
    transition_state: transitionState,
  });

  if (activeTransition) {
    const writeResult = updateTransitionLifecycle({
      transition_id: activeTransition.transition_id,
      last_detection_id: detectionId,
      last_seen: detectedAt,
      rank: asset.rank,
      price: asset.price,
      appearance_increment: 1,
      reentry_increment: 0,
      outcome_state: "active",
      snapshot_version: snapshotVersion,
      analytical_version: analyticalVersion,
    });

    return {
      ok: writeResult.ok,
      status: writeResult.ok ? "updated" : "invalid",
      asset_id: assetId,
      symbol,
      transition_id: writeResult.record?.transition_id ?? null,
      transition_state: transitionState,
      action: "update",
      record: writeResult.record,
      write_result: writeResult,
      warnings: writeResult.error
        ? [`transition_lifecycle_update_failed:${writeResult.error}`]
        : [],
      error: writeResult.error,
    };
  }

  const writeResult = recordTransitionLifecycle({
    asset_id: assetId,
    symbol,
    name,
    transition_state: transitionState,
    outcome_state: "active",
    first_detection_id: detectionId,
    last_detection_id: detectionId,
    first_seen: detectedAt,
    last_seen: detectedAt,
    entry_rank: asset.rank,
    exit_rank: asset.rank,
    best_rank: asset.rank,
    worst_rank: asset.rank,
    average_rank: asset.rank,
    entry_price: safeNullableNumber(asset.price),
    exit_price: safeNullableNumber(asset.price),
    appearance_count: 1,
    reentry_count: 0,
    snapshot_version: snapshotVersion,
    analytical_version: analyticalVersion,
  });

  return {
    ok: writeResult.ok,
    status: writeResult.ok ? "recorded" : "invalid",
    asset_id: assetId,
    symbol,
    transition_id: writeResult.record?.transition_id ?? null,
    transition_state: transitionState,
    action: "record",
    record: writeResult.record,
    write_result: writeResult,
    warnings: writeResult.error
      ? [`transition_lifecycle_record_failed:${writeResult.error}`]
      : [],
    error: writeResult.error,
  };
}
