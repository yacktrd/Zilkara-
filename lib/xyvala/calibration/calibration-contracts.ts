/* ============================================================================
 * FILE: lib/xyvala/calibration/calibration-contracts.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala calibration contracts barrel
 *
 * ROLE
 * - central export hub for calibration contracts
 * - expose stable calibration domain contracts
 * - preserve progressive migration compatibility
 *
 * DIRECTIVES
 * - exports only
 * - no runtime logic
 * - no persistence logic
 * - no contract definitions
 * - no duplicated aliases
 * - no business logic
 * - no analytical logic
 * - no governance logic
 *
 * INVARIANTS
 * - calibration-contracts.ts is a barrel file only
 * - all canonical contracts live in dedicated domain files
 * - imports must progressively migrate toward domain contracts
 * ========================================================================== */

export * from "./contracts/calibration-core-contracts";

export * from "./contracts/calibration-governance-contracts";

export * from "./contracts/calibration-distribution-contracts";

export * from "./contracts/calibration-policy-contracts";

export * from "./contracts/calibration-sample-contracts";

export * from "./contracts/calibration-runtime-contracts";

export * from "./contracts/calibration-scoring-contracts";

export * from "./contracts/calibration-report-contracts";

export * from "./contracts/calibration-legacy-contracts";
