// lib/xyvala/access/access-guards.ts

import type { ScanAsset } from "@/lib/xyvala/contracts/scan-contract";
import type { AccessMeta, AccessScope } from "./access-types";

function safeNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function safeNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

export function applyScanCompartment(
  data: ScanAsset[],
  scope: AccessScope
): ScanAsset[] {
  return data.slice(0, scope.maxAssets).map((asset) => ({
    ...asset,
    score_delta: scope.showScoreDelta
      ? safeNullableNumber(asset.score_delta)
      : null,
    score_trend: scope.showScoreTrend
      ? safeNullableString(asset.score_trend)
      : null,
  }));
}

export function buildAccessMeta(scope: AccessScope): AccessMeta {
  return {
    compartment: scope.compartment,
    visiblePercent: scope.visiblePercent,
    maxAssets: scope.maxAssets,
  };
}
