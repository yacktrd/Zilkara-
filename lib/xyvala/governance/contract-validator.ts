/* ============================================================================
 * FILE: lib/xyvala/governance/contract-validator.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala private contract validator
 *
 * ROLE
 * - validate PrivateScanAsset contract integrity
 * - detect invalid critical values before traceability governance
 * - prevent corrupted private assets from crossing governance boundaries
 * - provide deterministic contract validation diagnostics without mutation
 *
 * DIRECTIVES
 * - governance validation only
 * - compute layer only
 * - no market computation
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration logic
 * - no public projection
 * - no API logic
 * - no UI logic
 * - no cache mutation
 * - no persistence
 * - no event bus
 * - deterministic validation only
 *
 * INPUTS
 * - PrivateScanAsset[]
 *
 * OUTPUTS
 * - ContractValidationReport
 *
 * INVARIANTS
 * - validator never creates analytical truth
 * - validator never mutates runtime state
 * - validator only validates already produced values
 * - null means explicitly unavailable
 * - undefined is always invalid
 *
 * CRITICAL DEPENDENCIES
 * - PrivateScanAsset
 *
 * SENSITIVE ZONES
 * - private analytical variables
 * - decision integrity
 * - score boundaries
 * - public/private boundary protection
 * ========================================================================== */

import type {
  PrivateScanAsset,
  PrivateScanDecision,
  PrivateScanRegime,
  PrivateScanStatus,
} from "@/lib/xyvala/contracts/scan-private-contract";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type ContractValidationStatus =
  | "valid"
  | "partial"
  | "invalid"
  | "empty";

export type ContractValidationSeverity =
  | "none"
  | "minor"
  | "major"
  | "critical";

export type ContractValidationViolation = {
  asset_id: string;
  symbol: string;
  variable_name: string;
  violation_code: string;
  severity: ContractValidationSeverity;
  expected: string;
  received: string;
};

export type ContractValidationReport = {
  ok: boolean;
  status: ContractValidationStatus;
  severity: ContractValidationSeverity;

  asset_count: number;
  checked_variables_count: number;
  violation_count: number;

  critical_violation_count: number;
  major_violation_count: number;
  minor_violation_count: number;

  violations: ContractValidationViolation[];
  warnings: string[];
  error: string | null;
};

/* ============================================================================
 * 2. CONTRACT CONSTANTS
 * ========================================================================== */

const VALID_REGIMES: readonly PrivateScanRegime[] = [
  "STABLE",
  "TRANSITION",
  "VOLATILE",
];

const VALID_DECISIONS: readonly PrivateScanDecision[] = [
  "ALLOW",
  "WATCH",
  "BLOCK",
];

const VALID_STATUSES: readonly PrivateScanStatus[] = [
  "computed",
  "partial",
  "degraded",
  "unavailable",
];

const CRITICAL_VARIABLES = new Set([
  "stability_score",
  "regime",
  "rupture_score",
  "rupture_probability",
  "crash_score",
  "crash_state",
  "decision",
]);

/* ============================================================================
 * 3. SAFE HELPERS
 * ========================================================================== */

function safeString(value: unknown, fallback = "unknown"): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function describeValue(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "non_finite_number";
  }

  return String(value);
}

function isFiniteNumberOrNull(value: unknown): boolean {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function isScoreOrNull(value: unknown): boolean {
  return (
    value === null ||
    (typeof value === "number" &&
      Number.isFinite(value) &&
      value >= 0 &&
      value <= 100)
  );
}

function isStatus(value: unknown): value is PrivateScanStatus {
  return VALID_STATUSES.includes(value as PrivateScanStatus);
}

function isRegime(value: unknown): value is PrivateScanRegime {
  return VALID_REGIMES.includes(value as PrivateScanRegime);
}

function isDecision(value: unknown): value is PrivateScanDecision {
  return VALID_DECISIONS.includes(value as PrivateScanDecision);
}

function maxSeverity(
  values: readonly ContractValidationSeverity[],
): ContractValidationSeverity {
  if (values.includes("critical")) return "critical";
  if (values.includes("major")) return "major";
  if (values.includes("minor")) return "minor";

  return "none";
}

function addViolation(
  violations: ContractValidationViolation[],
  input: {
    asset: PrivateScanAsset;
    variable_name: string;
    violation_code: string;
    severity?: ContractValidationSeverity;
    expected: string;
    received: unknown;
  },
): void {
  violations.push({
    asset_id: safeString(input.asset.id),
    symbol: safeString(input.asset.symbol),
    variable_name: input.variable_name,
    violation_code: input.violation_code,
    severity:
      input.severity ??
      (CRITICAL_VARIABLES.has(input.variable_name) ? "critical" : "major"),
    expected: input.expected,
    received: describeValue(input.received),
  });
}

/* ============================================================================
 * 4. VALIDATION HELPERS
 * ========================================================================== */

function validateScore(
  violations: ContractValidationViolation[],
  asset: PrivateScanAsset,
  variableName: keyof PrivateScanAsset,
): void {
  const value = asset[variableName];

  if (value === undefined) {
    addViolation(violations, {
      asset,
      variable_name: String(variableName),
      violation_code: "CONTRACT_UNDEFINED_VALUE",
      expected: "number_between_0_and_100_or_null",
      received: value,
    });

    return;
  }

  if (!isScoreOrNull(value)) {
    addViolation(violations, {
      asset,
      variable_name: String(variableName),
      violation_code: "CONTRACT_INVALID_SCORE",
      expected: "number_between_0_and_100_or_null",
      received: value,
    });
  }
}

function validateNumberOrNull(
  violations: ContractValidationViolation[],
  asset: PrivateScanAsset,
  variableName: keyof PrivateScanAsset,
): void {
  const value = asset[variableName];

  if (value === undefined) {
    addViolation(violations, {
      asset,
      variable_name: String(variableName),
      violation_code: "CONTRACT_UNDEFINED_VALUE",
      severity: "major",
      expected: "finite_number_or_null",
      received: value,
    });

    return;
  }

  if (!isFiniteNumberOrNull(value)) {
    addViolation(violations, {
      asset,
      variable_name: String(variableName),
      violation_code: "CONTRACT_INVALID_NUMBER",
      severity: "major",
      expected: "finite_number_or_null",
      received: value,
    });
  }
}

function validateStatus(
  violations: ContractValidationViolation[],
  asset: PrivateScanAsset,
  variableName: keyof PrivateScanAsset,
): void {
  const value = asset[variableName];

  if (!isStatus(value)) {
    addViolation(violations, {
      asset,
      variable_name: String(variableName),
      violation_code: "CONTRACT_INVALID_STATUS",
      severity: "major",
      expected: VALID_STATUSES.join("|"),
      received: value,
    });
  }
}

function validateAssetIdentity(
  violations: ContractValidationViolation[],
  asset: PrivateScanAsset,
): void {
  if (safeString(asset.id, "").length === 0) {
    addViolation(violations, {
      asset,
      variable_name: "id",
      violation_code: "CONTRACT_INVALID_ID",
      severity: "critical",
      expected: "non_empty_string",
      received: asset.id,
    });
  }

  if (safeString(asset.symbol, "").length === 0) {
    addViolation(violations, {
      asset,
      variable_name: "symbol",
      violation_code: "CONTRACT_INVALID_SYMBOL",
      severity: "critical",
      expected: "non_empty_string",
      received: asset.symbol,
    });
  }

  if (safeString(asset.name, "").length === 0) {
    addViolation(violations, {
      asset,
      variable_name: "name",
      violation_code: "CONTRACT_INVALID_NAME",
      severity: "major",
      expected: "non_empty_string",
      received: asset.name,
    });
  }
}

function validateDecisionLayer(
  violations: ContractValidationViolation[],
  asset: PrivateScanAsset,
): void {
  if (!isRegime(asset.regime)) {
    addViolation(violations, {
      asset,
      variable_name: "regime",
      violation_code: "CONTRACT_INVALID_REGIME",
      severity: "critical",
      expected: VALID_REGIMES.join("|"),
      received: asset.regime,
    });
  }

  if (!isDecision(asset.decision)) {
    addViolation(violations, {
      asset,
      variable_name: "decision",
      violation_code: "CONTRACT_INVALID_DECISION",
      severity: "critical",
      expected: VALID_DECISIONS.join("|"),
      received: asset.decision,
    });
  }
}

function validateGovernance(
  violations: ContractValidationViolation[],
  asset: PrivateScanAsset,
): void {
  if (asset.governance.deterministic !== true) {
    addViolation(violations, {
      asset,
      variable_name: "governance.deterministic",
      violation_code: "CONTRACT_NON_DETERMINISTIC_ASSET",
      severity: "critical",
      expected: "true",
      received: asset.governance.deterministic,
    });
  }

  if (asset.governance.jurisdiction !== "FR/EU") {
    addViolation(violations, {
      asset,
      variable_name: "governance.jurisdiction",
      violation_code: "CONTRACT_INVALID_JURISDICTION",
      severity: "critical",
      expected: "FR/EU",
      received: asset.governance.jurisdiction,
    });
  }

  if (asset.governance.default_currency !== "EUR") {
    addViolation(violations, {
      asset,
      variable_name: "governance.default_currency",
      violation_code: "CONTRACT_INVALID_DEFAULT_CURRENCY",
      severity: "critical",
      expected: "EUR",
      received: asset.governance.default_currency,
    });
  }
}

/* ============================================================================
 * 5. ASSET VALIDATION
 * ========================================================================== */

function validatePrivateScanAsset(
  asset: PrivateScanAsset,
): ContractValidationViolation[] {
  const violations: ContractValidationViolation[] = [];

  validateAssetIdentity(violations, asset);

  validateScore(violations, asset, "stability_score");
  validateScore(violations, asset, "structure_score");
  validateScore(violations, asset, "market_score");
  validateScore(violations, asset, "coherence_score");

  validateScore(violations, asset, "occurrence_score");
  validateScore(violations, asset, "frequency_score");
  validateScore(violations, asset, "convergence_score");
  validateScore(violations, asset, "duration_score");
  validateScore(violations, asset, "evolution_score");
  validateScore(violations, asset, "growth_score");

  validateScore(violations, asset, "rupture_score");
  validateScore(violations, asset, "rupture_probability");
  validateScore(violations, asset, "rupture_penalty_score");
  validateScore(violations, asset, "rupture_occurrence_score");
  validateScore(violations, asset, "rupture_frequency_score");
  validateScore(violations, asset, "rupture_convergence_score");
  validateScore(violations, asset, "rupture_duration_score");
  validateScore(violations, asset, "rupture_evolution_score");
  validateScore(violations, asset, "rupture_acceleration_score");

  validateScore(violations, asset, "crash_score");

  validateScore(violations, asset, "growth_score");
  validateScore(violations, asset, "core_pattern_score");
  validateScore(violations, asset, "decay_score");

  validateScore(violations, asset, "impulse_pressure_score");
  validateScore(violations, asset, "impulse_acceleration_score");
  validateScore(violations, asset, "impulse_alignment_score");
  validateScore(violations, asset, "impulse_instability_score");
  validateScore(violations, asset, "impulse_saturation_score");
  validateScore(violations, asset, "impulse_exhaustion_score");

  validateScore(violations, asset, "opportunity_score");
  validateScore(violations, asset, "confidence_score");
  validateScore(violations, asset, "continuity_probability");

  validateNumberOrNull(violations, asset, "price");
  validateNumberOrNull(violations, asset, "chg_24h_pct");
  validateNumberOrNull(violations, asset, "chg_7d_pct");
  validateNumberOrNull(violations, asset, "market_cap");
  validateNumberOrNull(violations, asset, "volume_24h");
  validateNumberOrNull(violations, asset, "rank");

  validateStatus(violations, asset, "stability_status");
  validateStatus(violations, asset, "growth_status");
  validateStatus(violations, asset, "core_status");
  validateStatus(violations, asset, "decay_status");
  validateStatus(violations, asset, "impulse_status");
  validateStatus(violations, asset, "neutralization_validity");
  validateStatus(violations, asset, "opportunity_status");
  validateStatus(violations, asset, "confidence_status");

  validateDecisionLayer(violations, asset);
  validateGovernance(violations, asset);

  return violations;
}

/* ============================================================================
 * 6. PUBLIC VALIDATOR API
 * ========================================================================== */

export function validatePrivateScanAssetsContract(input: {
  assets: readonly PrivateScanAsset[];
}): ContractValidationReport {
  if (!Array.isArray(input.assets) || input.assets.length === 0) {
    return {
      ok: true,
      status: "empty",
      severity: "none",

      asset_count: 0,
      checked_variables_count: 0,
      violation_count: 0,

      critical_violation_count: 0,
      major_violation_count: 0,
      minor_violation_count: 0,

      violations: [],
      warnings: ["contract_validator_assets_empty"],
      error: null,
    };
  }

  const violations = input.assets.flatMap(validatePrivateScanAsset);

  const criticalCount = violations.filter(
    (violation) => violation.severity === "critical",
  ).length;

  const majorCount = violations.filter(
    (violation) => violation.severity === "major",
  ).length;

  const minorCount = violations.filter(
    (violation) => violation.severity === "minor",
  ).length;

  const severity = maxSeverity(violations.map((violation) => violation.severity));

  const status: ContractValidationStatus =
    violations.length === 0
      ? "valid"
      : criticalCount > 0 || majorCount > 0
        ? "invalid"
        : "partial";

  return {
    ok: violations.length === 0,
    status,
    severity,

    asset_count: input.assets.length,
    checked_variables_count: input.assets.length * 42,
    violation_count: violations.length,

    critical_violation_count: criticalCount,
    major_violation_count: majorCount,
    minor_violation_count: minorCount,

    violations,
    warnings:
      violations.length > 0
        ? [`contract_validation_violations:${violations.length}`]
        : [],
    error: violations.length === 0 ? null : `contract_validation_${status}`,
  };
}

export function assertPrivateScanAssetsContractValid(input: {
  assets: readonly PrivateScanAsset[];
}): void {
  const report = validatePrivateScanAssetsContract(input);

  if (!report.ok) {
    throw new Error(
      `private_scan_asset_contract_invalid:${[
        report.status,
        report.severity,
        report.violation_count,
      ].join(":")}`,
    );
  }
}
