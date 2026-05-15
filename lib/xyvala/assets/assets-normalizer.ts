/* ============================================================================
 * FILE: lib/xyvala/assets/assets-normalizer.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala public assets normalizer
 *
 * ROLE
 * - normalize unknown scan-like values into public ScanAsset objects
 * - preserve public descriptive fields only
 * - prevent private analytical fields from leaking into public assets
 *
 * PARENTS
 * - lib/xyvala/contracts/scan-contract.ts
 * - lib/xyvala/mappers/scan-mapper.ts
 *
 * DIRECTIVES
 * - normalizer layer only
 * - public descriptive assets only
 * - no route logic
 * - no service orchestration
 * - no cache logic
 * - no provider logic
 * - no query logic
 * - no response building
 * - no RFS recomputation
 * - no MCI recomputation
 * - no regime exposure
 * - no decision exposure
 * - no opportunity exposure
 * - no stability score exposure
 * - no broker / affiliate exposure
 * - null means explicitly unavailable
 * - same input => same public output shape
 * ========================================================================== */

import type { ScanAsset } from "@/lib/xyvala/contracts/scan-contract";
import { mapScanItemToAsset } from "@/lib/xyvala/mappers/scan-mapper";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type AssetLikeInput = Partial<ScanAsset> & {
  key?: unknown;
  logo?: unknown;
  logoUrl?: unknown;
  image?: unknown;
  pct24h?: unknown;
  sparkline?: unknown;
};

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/* ============================================================================
 * 3. NORMALIZATION
 * ========================================================================== */

export function normalizeAsset(input: unknown): ScanAsset | null {
  if (!isPlainObject(input)) {
    return null;
  }

  const symbol = safeString(input.symbol).toUpperCase();

  if (!symbol) {
    return null;
  }

  return mapScanItemToAsset(input as AssetLikeInput);
}

export function normalizeAssets(input: unknown): ScanAsset[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const assets: ScanAsset[] = [];

  for (const item of input) {
    const normalized = normalizeAsset(item);

    if (normalized !== null) {
      assets.push(normalized);
    }
  }

  return assets;
}

export function hasPublicAssetIdentity(input: unknown): boolean {
  if (!isPlainObject(input)) {
    return false;
  }

  return safeString(input.symbol).length > 0;
}
