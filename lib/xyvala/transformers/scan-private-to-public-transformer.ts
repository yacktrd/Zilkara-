/* ============================================================================
 * FILE: lib/xyvala/transformers/scan-private-to-public-transformer.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala private-to-public scan transformer compatibility entrypoint
 *
 * ROLE
 * - preserve legacy transformer import path
 * - re-export the canonical private-to-public scan transformer API
 * - avoid duplicated public projection logic
 *
 * DIRECTIVES
 * - compatibility only
 * - no runtime logic
 * - no normalization logic
 * - no public projection logic
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration logic
 * - no UI logic
 * - no API logic
 * - no broker / affiliation exposure
 *
 * INPUTS
 * - none
 *
 * OUTPUTS
 * - canonical scan transformer exports
 *
 * INVARIANTS
 * - services/scan-transformer.ts remains the single source of truth
 * - this file must not duplicate transformation logic
 * - private/public boundary remains centralized
 *
 * CRITICAL DEPENDENCIES
 * - lib/xyvala/services/scan-transformer.ts
 *
 * SENSITIVE ZONES
 * - legacy imports
 * - transformer boundary migration
 * ========================================================================== */

export {
  privateScanAssetToPublicScanAsset,
  privateScanAssetsToPublicScanAssets,
  transformScanAssets,
  toPublicScanAsset,
  toPublicScanAssets,
} from "@/lib/xyvala/services/scan-transformer";
